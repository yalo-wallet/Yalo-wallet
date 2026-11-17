import { useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, ArrowDownUp, ArrowLeftRight, BarChart3, CheckCircle2, ChevronDown, CircleHelp, Copy, ExternalLink, LogOut, Menu, QrCode, RefreshCw, Search, ShieldCheck, Wallet, X, Zap } from 'lucide-react';

type Pair = { chainId: string; dexId: string; url: string; pairAddress: string; baseToken: { address: string; name: string; symbol: string }; quoteToken: { address: string; name: string; symbol: string }; priceUsd?: string; liquidity?: { usd?: number }; volume?: { h24?: number }; fdv?: number; marketCap?: number };
type Quote = { estimate?: { toAmount?: string; toAmountMin?: string; executionDuration?: number; feeCosts?: Array<{ amountUSD?: string; name?: string }> }; transactionRequest?: { data?: string }; toolDetails?: { name?: string }; action?: { fromToken?: { symbol?: string }; toToken?: { symbol?: string } }; [key: string]: unknown };
const SOL = 'So11111111111111111111111111111111111111112';
const SOLANA_CHAIN = '1151111081099710';
const rpc = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const money = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 }) : '—';
const short = (s: string) => `${s.slice(0, 5)}…${s.slice(-5)}`;
function rawAmount(value: string, decimals: number) { if (!/^\d+(\.\d*)?$/.test(value) || Number(value) <= 0) throw new Error('Enter a valid amount.'); const [whole, fraction = ''] = value.split('.'); if (fraction.length > decimals) throw new Error(`This token supports up to ${decimals} decimal places.`); return (BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString(); }
function App() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const wallet = wallets[0];
  const address = wallet?.address ?? '';
  const [tab, setTab] = useState<'trade'|'markets'|'receive'|'activity'>('trade');
  const [mode, setMode] = useState<'buy'|'sell'>('buy');
  const [mintInput, setMintInput] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [tokenDecimals, setTokenDecimals] = useState(6);
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenName, setTokenName] = useState('Select a Solana token');
  const [pair, setPair] = useState<Pair | null>(null);
  const [searching, setSearching] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{sig:string;side:string;token:string;time:string}>>([]);
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => { if (!address) { setBalance(null); return; } let live = true; const load = async () => { try { const lamports = await rpc.getBalance(new PublicKey(address)); if (live) setBalance(lamports / LAMPORTS_PER_SOL); } catch { if (live) setBalance(null); } }; void load(); const timer = window.setInterval(load, 25000); return () => { live = false; window.clearInterval(timer); }; }, [address]);

  const chartPair = pair?.pairAddress;
  const explorer = useMemo(() => address ? `https://solscan.io/account/${address}` : 'https://solscan.io', [address]);

  async function searchToken(value = mintInput) {
    const query = value.trim(); if (!query) { setError('Enter a token name, symbol or mint address.'); return; }
    setSearching(true); setError(''); setQuote(null); setPair(null);
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Token search is temporarily unavailable.');
      const data = await response.json() as { pairs?: Pair[] };
      const matches = (data.pairs ?? []).filter(p => p.chainId === 'solana').sort((a,b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      const found = matches.find(p => p.baseToken.address.toLowerCase() === query.toLowerCase()) ?? matches[0];
      if (!found) throw new Error('No Solana market found for this search.');
      setPair(found); setMintInput(found.baseToken.address); setTokenName(found.baseToken.name); setTokenSymbol(found.baseToken.symbol);
      const mint = await getMint(rpc, new PublicKey(found.baseToken.address)); setTokenDecimals(mint.decimals);
      setTab('trade');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not find token.'); }
    finally { setSearching(false); }
  }

  async function getQuote() {
    if (!address) { await login(); return; }
    if (!pair) { setError('Search and select a Solana token first.'); return; }
    setBusy(true); setError(''); setMessage(''); setQuote(null);
    try {
      const fromToken = mode === 'buy' ? SOL : pair.baseToken.address;
      const toToken = mode === 'buy' ? pair.baseToken.address : SOL;
      const decimals = mode === 'buy' ? 9 : tokenDecimals;
      const body = { fromChain: SOLANA_CHAIN, toChain: SOLANA_CHAIN, fromToken, toToken, fromAmount: rawAmount(amount, decimals), fromAddress: address, slippage: '0.5' };
      const response = await fetch('/api/lifi/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? 'Could not get a live quote.');
      if (!data.transactionRequest?.data) throw new Error('The provider did not return an executable Solana transaction for this token.');
      setQuote(data as Quote);
    } catch (e) { setError(e instanceof Error ? e.message : 'Quote request failed.'); }
    finally { setBusy(false); }
  }

  async function executeTrade() {
    if (!wallet || !quote?.transactionRequest?.data) return;
    setBusy(true); setError(''); setMessage('Waiting for wallet approval…');
    try {
      const bytes = Uint8Array.from(atob(quote.transactionRequest.data), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(bytes);
      const result = await signAndSendTransaction({ transaction: transaction.serialize(), wallet, chain: 'solana:mainnet' });
      const sig = result.signature;
      setMessage('Transaction sent. Waiting for Solana confirmation…');
      await rpc.confirmTransaction(sig, 'confirmed');
      setHistory(prev => [{ sig, side: mode.toUpperCase(), token: tokenSymbol, time: new Date().toLocaleString() }, ...prev]);
      setMessage('Trade confirmed on Solana.'); setQuote(null);
      const lamports = await rpc.getBalance(new PublicKey(address)); setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e) { setError(e instanceof Error ? e.message : 'Transaction was not completed.'); setMessage(''); }
    finally { setBusy(false); }
  }

  async function copyAddress() { if (!address) return; await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  if (!ready || !walletsReady) return <div className="loading-screen"><div className="brand-mark">Y</div><p>Preparing YALO Wallet…</p></div>;

  return <div className="shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">Y</div><div><b>YALO</b><small>WALLET</small></div><button className="mobile-close" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="nav-caption">WORKSPACE</div>
      <button className={`nav-link ${tab==='trade'?'active':''}`} onClick={()=>{setTab('trade');setMobileMenu(false)}}><ArrowLeftRight/> Trade</button>
      <button className={`nav-link ${tab==='markets'?'active':''}`} onClick={()=>{setTab('markets');setMobileMenu(false)}}><BarChart3/> Markets</button>
      <button className={`nav-link ${tab==='receive'?'active':''}`} onClick={()=>{setTab('receive');setMobileMenu(false)}}><QrCode/> Receive</button>
      <button className={`nav-link ${tab==='activity'?'active':''}`} onClick={()=>{setTab('activity');setMobileMenu(false)}}><Activity/> Activity</button>
      <div className="sidebar-bottom"><div className="security"><ShieldCheck/><div><b>Self-custody</b><small>Transactions require your approval.</small></div></div><div className="sidebar-foot"><i/> Solana Mainnet <span>LIVE</span></div></div>
    </aside>
    {mobileMenu && <button className="scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <main className="main">
      <header className="topbar"><div className="crumb"><button className="menu-button" onClick={()=>setMobileMenu(true)}><Menu/></button><span>YALO</span><b>/ {tab.toUpperCase()}</b></div><div className="top-actions"><div className="network-tag"><i/> Solana Mainnet</div>{authenticated ? <><div className="balance-tag">{balance === null ? '—' : `${balance.toFixed(4)} SOL`}</div><button className="wallet-button" onClick={()=>void logout()}><span className="avatar">Y</span>{short(address)}<LogOut size={14}/></button></> : <button className="primary" onClick={()=>void login()}><Wallet size={16}/> Connect wallet</button>}</div></header>
      <div className="content">
        {tab==='trade' && <>
          <div className="page-heading"><div><p className="eyebrow">SOLANA DECENTRALIZED TRADING</p><h1>Trade <em>tokens.</em></h1><p>Buy and sell Solana tokens directly from your connected wallet.</p></div><span className="live-pill"><i/> LIVE NETWORK</span></div>
          <div className="trade-layout">
            <section className="panel trade-panel"><div className="panel-title"><div><h2>Swap tokens</h2><p>Live route · wallet-signed transaction</p></div><span className="gold-icon"><Zap/></span></div>
              <div className="mode-switch"><button className={mode==='buy'?'selected':''} onClick={()=>{setMode('buy');setQuote(null);setError('')}}>Buy</button><button className={mode==='sell'?'selected':''} onClick={()=>{setMode('sell');setQuote(null);setError('')}}>Sell</button></div>
              <label className="field-label">TOKEN TO {mode==='buy'?'BUY':'SELL'}</label><div className="search-line"><input value={mintInput} onChange={e=>setMintInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchToken()}} placeholder="Token name, symbol or mint address"/><button className="search-button" onClick={()=>void searchToken()} disabled={searching}>{searching?<RefreshCw className="spin"/>:<Search/>}</button></div>
              {pair && <div className="token-found"><div className="token-avatar">{tokenSymbol.slice(0,1)}</div><div className="token-info"><b>{tokenName} <span>{tokenSymbol}</span></b><small>{short(pair.baseToken.address)}</small></div><button className="copy-small" onClick={()=>void navigator.clipboard.writeText(pair.baseToken.address)}><Copy size={14}/></button></div>}
              <label className="field-label amount-label">{mode==='buy'?'YOU PAY':'TOKEN AMOUNT'}</label><div className="amount-box"><input type="number" min="0" step="any" value={amount} onChange={e=>{setAmount(e.target.value);setQuote(null)}}/><span className="asset-chip"><i className={mode==='buy'?'sol-dot':'token-dot'}/>{mode==='buy'?'SOL':tokenSymbol}<ChevronDown size={14}/></span></div>
              <div className="balance-line"><span>Network</span><b>Solana Mainnet</b></div><div className="balance-line"><span>Slippage tolerance</span><b>0.50%</b></div>
              {quote && <div className="quote-box"><div className="quote-title"><CheckCircle2/> Live quote received</div><div className="quote-row"><span>Estimated receive</span><b>{quote.estimate?.toAmount ? `${(Number(quote.estimate.toAmount)/10**(mode==='buy'?tokenDecimals:9)).toLocaleString('en-US',{maximumFractionDigits:6})} ${mode==='buy'?tokenSymbol:'SOL'}` : 'See quote details'}</b></div><div className="quote-row"><span>Minimum received</span><b>{quote.estimate?.toAmountMin ? (Number(quote.estimate.toAmountMin)/10**(mode==='buy'?tokenDecimals:9)).toLocaleString('en-US',{maximumFractionDigits:6}) : '—'}</b></div><div className="quote-row"><span>Route</span><b>{quote.toolDetails?.name ?? 'LI.FI route'}</b></div></div>}
              {error && <div className="error-box">{error}</div>}{message && <div className="message-box">{message}</div>}
              {!quote ? <button className="primary trade-action" disabled={busy||searching} onClick={()=>void getQuote()}>{busy?<><RefreshCw className="spin"/> Getting live quote…</>:<>Get live quote <ArrowDownUp/></>}</button> : <button className="primary trade-action" disabled={busy} onClick={()=>void executeTrade()}>{busy?<><RefreshCw className="spin"/> Processing…</>:<>Confirm & sign trade <ShieldCheck/></>}</button>}
              <p className="fine-print">Review the quote before signing. Network fees apply. Trades are final once confirmed on-chain.</p>
            </section>
            <section className="panel market-panel"><div className="panel-title"><div><h2>Token market</h2><p>Live Solana market data</p></div><BarChart3 className="muted-icon"/></div>
              {pair ? <><div className="market-summary"><div><small>{pair.baseToken.name} / {pair.quoteToken.symbol}</small><h3>{money(Number(pair.priceUsd))}</h3></div><span className="live-pill"><i/> LIVE</span></div><div className="market-stats"><div><small>Liquidity</small><b>{money(pair.liquidity?.usd)}</b></div><div><small>24h volume</small><b>{money(pair.volume?.h24)}</b></div><div><small>Market cap</small><b>{money(pair.marketCap ?? pair.fdv)}</b></div></div><div className="chart-frame"><iframe title="DexScreener chart" src={`https://dexscreener.com/solana/${chartPair}?embed=1&theme=dark&trades=0&info=0`} loading="lazy" allow="clipboard-write"/></div><a className="external-link" href={pair.url} target="_blank" rel="noreferrer">Open market on DexScreener <ExternalLink size={14}/></a></> : <div className="empty-market"><div className="chart-placeholder"><BarChart3/></div><b>Search a token to view its chart</b><p>Enter a Solana token name, symbol or mint address.</p></div>}
            </section>
          </div>
          <div className="notice"><ShieldCheck/><div><b>Trade safely</b><p>Token search is sourced from public market data. Always verify the mint address. A token must have available liquidity and a valid route to trade.</p></div></div>
        </>}
        {tab==='markets' && <><div className="page-heading"><div><p className="eyebrow">SOLANA ECOSYSTEM</p><h1>Explore <em>markets.</em></h1><p>Find a token by name, symbol or mint address.</p></div></div><div className="panel market-search-panel"><div className="search-line large"><input value={mintInput} onChange={e=>setMintInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchToken()}} placeholder="Search Solana tokens…"/><button className="search-button" onClick={()=>void searchToken()}><Search/></button></div>{pair && <div className="market-result"><div><b>{pair.baseToken.name} ({pair.baseToken.symbol})</b><small>{pair.baseToken.address}</small></div><strong>{money(Number(pair.priceUsd))}</strong><button className="primary" onClick={()=>setTab('trade')}>Trade token</button></div>}</div></>}
        {tab==='receive' && <><div className="page-heading"><div><p className="eyebrow">YOUR WALLET</p><h1>Receive <em>SOL.</em></h1><p>Share your Solana address to receive SOL or SPL tokens.</p></div></div><section className="panel receive-panel"><div className="qr-wrap">{address?<QRCodeSVG value={address} size={210} bgColor="#ffffff" fgColor="#090d16" level="H" includeMargin/>:<div className="qr-empty"><QrCode/></div>}</div><h2>{address?short(address):'Connect your wallet'}</h2><p>{address?'Only send Solana network assets to this address.':'Connect your Privy wallet to display your receiving address.'}</p>{address&&<button className="primary" onClick={()=>void copyAddress()}><Copy size={16}/>{copied?'Copied':'Copy wallet address'}</button>}</section></>}
        {tab==='activity' && <><div className="page-heading"><div><p className="eyebrow">ON-CHAIN RECORDS</p><h1>Trade <em>activity.</em></h1><p>Transactions confirmed during this browser session.</p></div></div><section className="panel activity-panel">{history.length?history.map(item=><div className="activity-row" key={item.sig}><div className="activity-icon"><ArrowLeftRight/></div><div><b>{item.side} {item.token}</b><small>{item.time}</small><a href={`https://solscan.io/tx/${item.sig}`} target="_blank" rel="noreferrer">{short(item.sig)} <ExternalLink size={12}/></a></div><span className="confirmed">Confirmed</span></div>):<div className="empty-market"><Activity/><b>No trades in this session yet</b><p>Completed trades will appear here.</p></div>}</section></>}
        <footer className="footer"><span>© {new Date().getFullYear()} YALO Wallet</span><a href={explorer} target="_blank" rel="noreferrer">Solana Explorer <ExternalLink size={12}/></a><span>Powered by Privy · LI.FI · DexScreener</span></footer>
      </div>
    </main>
  </div>;
}
export default App;
