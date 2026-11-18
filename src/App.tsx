import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { useWallets as useEvmWallets } from '@privy-io/react-auth';
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Activity, ArrowDownUp, ArrowLeftRight, BarChart3, CheckCircle2, ChevronDown,
  Copy, ExternalLink, Eye, EyeOff, LogOut, Menu, QrCode, RefreshCw, Search,
  Settings, ShieldCheck, UserCircle, Wallet, X, Zap, Send, Download, Star,
  LayoutDashboard, PieChart, Camera, ScanLine, CircleUserRound
} from 'lucide-react';

type Chain = 'solana' | 'ethereum' | 'base';
type Tab = 'overview' | 'swap' | 'send' | 'receive' | 'markets' | 'portfolio' | 'activity' | 'watchlist' | 'profile' | 'settings';
type Pair = {
  chainId: string; dexId: string; url: string; pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string; liquidity?: { usd?: number }; volume?: { h24?: number };
  fdv?: number; marketCap?: number;
};
type Quote = {
  estimate?: { toAmount?: string; toAmountMin?: string; executionDuration?: number };
  transactionRequest?: { data?: string };
  toolDetails?: { name?: string };
  action?: { fromToken?: { symbol?: string }; toToken?: { symbol?: string } };
  [key: string]: unknown;
};
type ActivityItem = { hash: string; label: string; chain: Chain; time: string; status: string };
const SOL_NATIVE = '11111111111111111111111111111111';
const SOLANA_CHAIN = '1151111081099710';
const SOL_RPC = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const money = (n?: number) => typeof n === 'number' && Number.isFinite(n)
  ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 }) : '—';
const short = (s = '') => s ? `${s.slice(0, 6)}…${s.slice(-5)}` : '—';
const CHAIN_IDS: Record<Chain, number> = { ethereum: 1, base: 8453, solana: 0 };
const chainName: Record<Chain, string> = { solana: 'Solana', ethereum: 'Ethereum', base: 'Base' };
function rawAmount(value: string, decimals: number) {
  if (!/^\d+(\.\d*)?$/.test(value) || Number(value) <= 0) throw new Error('Shigar da adadi mai inganci.');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Wannan token yana karɓar decimal ${decimals} kawai.`);
  return (BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString();
}
function App() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets: solWallets, ready: solReady } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const evmResult = useEvmWallets() as any;
  const evmWallets = evmResult.wallets ?? [];
  const solWallet = solWallets[0];
  const evmWallet = evmWallets[0];
  const solAddress = solWallet?.address ?? '';
  const evmAddress = evmWallet?.address ?? '';
  const [tab, setTab] = useState<Tab>('overview');
  const [chain, setChain] = useState<Chain>('solana');
  const [mode, setMode] = useState<'buy'|'sell'>('buy');
  const [mintInput, setMintInput] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [tokenDecimals, setTokenDecimals] = useState(6);
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenName, setTokenName] = useState('Zaɓi Solana token');
  const [pair, setPair] = useState<Pair | null>(null);
  const [searching, setSearching] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [evmBalance, setEvmBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [watchlist, setWatchlist] = useState<Pair[]>([]);
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendChain, setSendChain] = useState<Chain>('solana');
  const [receiveChain, setReceiveChain] = useState<Chain>('solana');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hideBalance, setHideBalance] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElement = 'yalo-qr-reader';

  useEffect(() => {
    if (!solAddress) { setSolBalance(null); return; }
    let live = true;
    const load = async () => {
      try { const lamports = await SOL_RPC.getBalance(new PublicKey(solAddress)); if (live) setSolBalance(lamports / LAMPORTS_PER_SOL); }
      catch { if (live) setSolBalance(null); }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { live = false; window.clearInterval(timer); };
  }, [solAddress]);

  useEffect(() => {
    if (!evmWallet) { setEvmBalance(null); return; }
    let live = true;
    const load = async () => {
      try {
        const provider = await (evmWallet as any).getEthereumProvider();
        const raw = await provider.request({ method: 'eth_getBalance', params: [evmAddress, 'latest'] });
        const value = Number(BigInt(raw)) / 1e18;
        if (live) setEvmBalance(value.toFixed(5));
      } catch { if (live) setEvmBalance(null); }
    };
    void load();
    return () => { live = false; };
  }, [evmWallet, evmAddress, chain]);

  useEffect(() => {
    if (!scanOpen) return;
    let cancelled = false;
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(scannerElement);
        scannerRef.current = scanner;
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decoded) => {
            if (cancelled) return;
            setScanMessage(decoded);
            try {
              const parsed = new URL(decoded);
              if (parsed.protocol === 'yalo:') {
                const address = parsed.searchParams.get('address') ?? '';
                const network = parsed.searchParams.get('chain') as Chain | null;
                if (address) setSendTo(address);
                if (network && ['solana','ethereum','base'].includes(network)) setSendChain(network);
              } else if (decoded.startsWith('0x') || decoded.length > 30) setSendTo(decoded);
            } catch {
              if (decoded.startsWith('0x') || decoded.length > 30) setSendTo(decoded);
            }
            setScanOpen(false);
            try { await scanner.stop(); scanner.clear(); } catch {}
          }, () => {});
      } catch (e) {
        setScanMessage(e instanceof Error ? e.message : 'Ba a iya buɗe camera ba.');
      }
    };
    void start();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) void scanner.stop().catch(() => {}).finally(() => { try { scanner.clear(); } catch {} });
    };
  }, [scanOpen]);

  const activeAddress = chain === 'solana' ? solAddress : evmAddress;
  const explorer = chain === 'solana'
    ? (solAddress ? `https://solscan.io/account/${solAddress}` : 'https://solscan.io')
    : evmAddress ? `https://${chain === 'base' ? 'basescan.org' : 'etherscan.io'}/address/${evmAddress}` : '#';
  const receiveAddress = receiveChain === 'solana' ? solAddress : evmAddress;
  const qrValue = receiveAddress ? `yalo:pay?chain=${receiveChain}&address=${receiveAddress}` : '';
  const email = user?.email?.address ?? '';
  const walletCount = [solAddress, evmAddress].filter(Boolean).length;

  async function copyText(value: string) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setError('Ba a iya copy ba. Ka zaɓi address ka kwafa da hannu.'); }
  }

  async function searchToken(value = mintInput) {
    const query = value.trim();
    if (!query) { setError('Shigar da sunan token, symbol ko mint address.'); return; }
    setSearching(true); setError(''); setQuote(null); setPair(null);
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Binciken token bai samu ba a yanzu.');
      const data = await response.json() as { pairs?: Pair[] };
      const matches = (data.pairs ?? []).filter(p => p.chainId === 'solana').sort((a,b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      const found = matches.find(p => p.baseToken.address.toLowerCase() === query.toLowerCase()) ?? matches[0];
      if (!found) throw new Error('Ba a samu kasuwar Solana ta wannan token ba.');
      setPair(found); setMintInput(found.baseToken.address); setTokenName(found.baseToken.name); setTokenSymbol(found.baseToken.symbol);
      const mint = await getMint(SOL_RPC, new PublicKey(found.baseToken.address));
      setTokenDecimals(mint.decimals); setTab('swap');
    } catch (e) { setError(e instanceof Error ? e.message : 'Ba a iya samun token ba.'); }
    finally { setSearching(false); }
  }

  async function getQuote() {
    if (!authenticated) { await login(); return; }
    if (!solAddress) { setError('Ba a samu Solana wallet ba. Ka tabbatar Privy ya ƙirƙiri wallet.'); return; }
    if (!pair) { setError('Da farko ka nemo Solana token.'); return; }
    setBusy(true); setError(''); setMessage(''); setQuote(null);
    try {
      const fromToken = mode === 'buy' ? SOL_NATIVE : pair.baseToken.address;
      const toToken = mode === 'buy' ? pair.baseToken.address : SOL_NATIVE;
      const decimals = mode === 'buy' ? 9 : tokenDecimals;
      const body = { fromChain: SOLANA_CHAIN, toChain: SOLANA_CHAIN, fromToken, toToken, fromAmount: rawAmount(amount, decimals), fromAddress: solAddress, slippage: '0.5' };
      const response = await fetch('/api/lifi/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? 'Ba a samu live quote ba.');
      if (!data.transactionRequest?.data) throw new Error('Ba a samu transaction da za a iya sa hannu ba ga wannan route.');
      setQuote(data as Quote);
    } catch (e) { setError(e instanceof Error ? e.message : 'Quote request failed.'); }
    finally { setBusy(false); }
  }

  async function executeTrade() {
    if (!solWallet || !quote?.transactionRequest?.data) return;
    setBusy(true); setError(''); setMessage('Ana jiran izinin wallet…');
    try {
      const bytes = Uint8Array.from(atob(quote.transactionRequest.data), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(bytes);
      const result = await signAndSendTransaction({ transaction: transaction.serialize(), wallet: solWallet, chain: 'solana:mainnet' });
      const sig = result.signature;
      setMessage('An aika transaction. Ana jiran tabbatarwa…');
      await SOL_RPC.confirmTransaction(sig, 'confirmed');
      setHistory(prev => [{ hash: sig, label: `${mode.toUpperCase()} ${tokenSymbol}`, chain: 'solana', time: new Date().toLocaleString(), status: 'Confirmed' }, ...prev]);
      setMessage('An tabbatar da swap a Solana.'); setQuote(null);
      const lamports = await SOL_RPC.getBalance(new PublicKey(solAddress)); setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ba a kammala transaction ba.'); setMessage(''); }
    finally { setBusy(false); }
  }

  async function sendFunds() {
    setBusy(true); setError(''); setMessage('');
    try {
      if (!sendTo.trim() || !sendAmount.trim()) throw new Error('Cika address da amount.');
      if (sendChain === 'solana') {
        if (!solWallet || !solAddress) throw new Error('Solana wallet bai haɗu ba.');
        const lamports = BigInt(rawAmount(sendAmount, 9));
        const latest = await SOL_RPC.getLatestBlockhash('confirmed');
        const tx = new Transaction({
          feePayer: new PublicKey(solAddress),
          recentBlockhash: latest.blockhash,
        }).add(SystemProgram.transfer({
          fromPubkey: new PublicKey(solAddress),
          toPubkey: new PublicKey(sendTo.trim()),
          lamports,
        }));
        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const result = await signAndSendTransaction({ transaction: serialized, wallet: solWallet, chain: 'solana:mainnet' });
        await SOL_RPC.confirmTransaction(result.signature, 'confirmed');
        setHistory(prev => [{ hash: result.signature, label: `Sent ${sendAmount} SOL`, chain: 'solana', time: new Date().toLocaleString(), status: 'Confirmed' }, ...prev]);
        setMessage('An aika SOL kuma an tabbatar da transaction.');
      } else {
        if (!evmWallet) throw new Error('EVM wallet bai haɗu ba.');
        if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo.trim())) throw new Error('Ethereum/Base address ba daidai ba ne.');
        const provider = await (evmWallet as any).getEthereumProvider();
        const chainId = CHAIN_IDS[sendChain];
        try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] }); }
        catch (switchError: any) {
          if (switchError?.code === 4902 && sendChain === 'base') {
            await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] }] });
          } else throw switchError;
        }
        const value = `0x${BigInt(rawAmount(sendAmount, 18)).toString(16)}`;
        const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: evmAddress, to: sendTo.trim(), value }] });
        setHistory(prev => [{ hash, label: `Sent ${sendAmount} ${sendChain === 'base' ? 'ETH' : 'ETH'}`, chain: sendChain, time: new Date().toLocaleString(), status: 'Submitted' }, ...prev]);
        setMessage('An aika transaction. Duba explorer domin tabbatarwa.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Ba a iya aika kuɗin ba.'); }
    finally { setBusy(false); }
  }

  function addWatchlist() {
    if (!pair) return;
    setWatchlist(prev => prev.some(p => p.pairAddress === pair.pairAddress) ? prev : [pair, ...prev]);
  }
  function openTab(next: Tab) { setTab(next); setMobileMenu(false); setError(''); setMessage(''); }

  if (!ready || !solReady) return <div className="loading-screen"><div className="brand-mark">Y</div><p>YALO Wallet yana shiryawa…</p></div>;

  const nav: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'receive', label: 'Receive', icon: Download },
    { id: 'markets', label: 'Markets', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
  ];

  return <div className="shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">Y</div><div><b>YALO</b><small>WALLET</small></div><button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button></div>
      <div className="nav-caption">WALLET</div>
      {nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-link ${tab === item.id ? 'active' : ''}`} onClick={() => openTab(item.id)}><Icon />{item.label}</button>; })}
      <div className="nav-caption nav-caption-bottom">ACCOUNT</div>
      <button className={`nav-link ${tab === 'profile' ? 'active' : ''}`} onClick={() => openTab('profile')}><UserCircle />Profile</button>
      <button className={`nav-link ${tab === 'settings' ? 'active' : ''}`} onClick={() => openTab('settings')}><Settings />Settings</button>
      <div className="sidebar-bottom"><div className="security"><ShieldCheck /><div><b>Self-custody</b><small>Transactions suna buƙatar izinin wallet ɗinka.</small></div></div><div className="sidebar-foot"><i /> Multi-chain wallet <span>LIVE</span></div></div>
    </aside>
    {mobileMenu && <button className="scrim" onClick={() => setMobileMenu(false)} aria-label="Rufe menu" />}
    <main className="main">
      <header className="topbar">
        <div className="crumb"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu /></button><span>YALO</span><b>/ {tab.toUpperCase()}</b></div>
        <div className="top-actions">
          <select className="chain-select" value={chain} onChange={e => setChain(e.target.value as Chain)}><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="base">Base</option></select>
          <button className="icon-button" title="Profile" onClick={() => openTab('profile')}><CircleUserRound /></button>
          {authenticated ? <><div className="balance-tag">{hideBalance ? '••••••' : chain === 'solana' ? (solBalance === null ? '— SOL' : `${solBalance.toFixed(4)} SOL`) : (evmBalance ? `${evmBalance} ETH` : '— ETH')}</div><button className="wallet-button" onClick={() => void logout()}><span className="avatar">Y</span>{short(chain === 'solana' ? solAddress : evmAddress)}<LogOut size={14} /></button></> : <button className="primary" onClick={() => void login()}><Wallet size={16} /> Connect wallet</button>}
        </div>
      </header>
      <div className="content">
        {tab === 'overview' && <>
          <div className="page-heading"><div><p className="eyebrow">YOUR WEB3 WALLET</p><h1>Welcome to <em>YALO.</em></h1><p>Wallet ɗinka, duk networks ɗinka, a wuri guda.</p></div><span className="live-pill"><i /> WALLET STATUS</span></div>
          <div className="overview-grid">
            <section className="panel total-card"><div className="panel-title"><div><h2>Wallet overview</h2><p>Native asset balances</p></div><button className="icon-button" onClick={() => setHideBalance(v => !v)}>{hideBalance ? <Eye /> : <EyeOff />}</button></div>
              <div className="balance-list"><div><span className="coin-icon sol">S</span><div><b>Solana</b><small>{short(solAddress)}</small></div><strong>{hideBalance ? '••••' : solBalance === null ? '—' : `${solBalance.toFixed(4)} SOL`}</strong></div><div><span className="coin-icon eth">Ξ</span><div><b>Ethereum</b><small>{short(evmAddress)}</small></div><strong>{hideBalance ? '••••' : evmBalance ? `${evmBalance} ETH` : '— ETH'}</strong></div><div><span className="coin-icon base">B</span><div><b>Base</b><small>{short(evmAddress)}</small></div><strong>{hideBalance ? '••••' : 'Duba Base balance'}</strong></div></div>
              <div className="quick-actions"><button className="primary" onClick={() => openTab('send')}><Send /> Send</button><button className="secondary" onClick={() => openTab('receive')}><Download /> Receive</button><button className="secondary" onClick={() => openTab('swap')}><ArrowLeftRight /> Swap</button></div>
            </section>
            <section className="panel profile-summary"><div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} /> : 'Y'}</div><p className="eyebrow">YOUR PROFILE</p><h2>{profileName || user?.email?.address || 'YALO User'}</h2><p>{email || 'Wallet account'}</p><div className="profile-meta"><span>{walletCount} wallet addresses</span><span>3 networks supported</span></div><button className="secondary" onClick={() => openTab('profile')}>View profile <ExternalLink /></button></section>
          </div>
          <div className="section-heading"><h2>Quick access</h2></div><div className="quick-grid">{[{t:'Swap tokens',d:'Get a live route',i:ArrowLeftRight,a:'swap' as Tab},{t:'Send assets',d:'Transfer from wallet',i:Send,a:'send' as Tab},{t:'Receive assets',d:'Address and QR code',i:QrCode,a:'receive' as Tab},{t:'Explore markets',d:'Charts and market data',i:BarChart3,a:'markets' as Tab}].map(x => <button className="quick-tile" key={x.t} onClick={() => openTab(x.a)}><x.i /><b>{x.t}</b><small>{x.d}</small></button>)}</div>
        </>}
        {tab === 'swap' && <>
          <div className="page-heading"><div><p className="eyebrow">LIVE TOKEN TRADING</p><h1>Swap <em>tokens.</em></h1><p>Get a live quote and approve the transaction from your wallet.</p></div><span className="live-pill"><i /> LIVE QUOTE</span></div>
          <div className="trade-layout">
            <section className="panel trade-panel"><div className="panel-title"><div><h2>Swap tokens</h2><p>Solana token trading</p></div><span className="gold-icon"><Zap /></span></div>
              <div className="mode-switch"><button className={mode === 'buy' ? 'selected' : ''} onClick={() => { setMode('buy'); setQuote(null); setError(''); }}>Buy</button><button className={mode === 'sell' ? 'selected' : ''} onClick={() => { setMode('sell'); setQuote(null); setError(''); }}>Sell</button></div>
              <label className="field-label">TOKEN TO {mode === 'buy' ? 'BUY' : 'SELL'}</label><div className="search-line"><input value={mintInput} onChange={e => setMintInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void searchToken(); }} placeholder="Token name, symbol or mint address" /><button className="search-button" onClick={() => void searchToken()} disabled={searching}>{searching ? <RefreshCw className="spin" /> : <Search />}</button></div>
              {pair && <div className="token-found"><div className="token-avatar">{tokenSymbol.slice(0,1)}</div><div className="token-info"><b>{tokenName} <span>{tokenSymbol}</span></b><small>{short(pair.baseToken.address)}</small></div><button className="copy-small" onClick={() => void copyText(pair.baseToken.address)}><Copy size={14} /></button><button className="copy-small" onClick={addWatchlist}><Star size={14} /></button></div>}
              <label className="field-label amount-label">{mode === 'buy' ? 'YOU PAY' : 'TOKEN AMOUNT'}</label><div className="amount-box"><input type="number" min="0" step="any" value={amount} onChange={e => { setAmount(e.target.value); setQuote(null); }} /><span className="asset-chip"><i className={mode === 'buy' ? 'sol-dot' : 'token-dot'} />{mode === 'buy' ? 'SOL' : tokenSymbol}<ChevronDown size={14} /></span></div>
              <div className="balance-line"><span>Network</span><b>Solana Mainnet</b></div><div className="balance-line"><span>Slippage</span><b>0.50%</b></div>
              {quote && <div className="quote-box"><div className="quote-title"><CheckCircle2 /> Live quote received</div><div className="quote-row"><span>Estimated receive</span><b>{quote.estimate?.toAmount ? `${(Number(quote.estimate.toAmount) / 10 ** (mode === 'buy' ? tokenDecimals : 9)).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${mode === 'buy' ? tokenSymbol : 'SOL'}` : '—'}</b></div><div className="quote-row"><span>Minimum received</span><b>{quote.estimate?.toAmountMin ? (Number(quote.estimate.toAmountMin) / 10 ** (mode === 'buy' ? tokenDecimals : 9)).toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'}</b></div><div className="quote-row"><span>Route</span><b>{quote.toolDetails?.name ?? 'LI.FI route'}</b></div></div>}
              {error && <div className="error-box">{error}</div>}{message && <div className="message-box">{message}</div>}
              {!quote ? <button className="primary trade-action" disabled={busy || searching} onClick={() => void getQuote()}>{busy ? <><RefreshCw className="spin" /> Getting quote…</> : <>Get live quote <ArrowDownUp /></>}</button> : <button className="primary trade-action" disabled={busy} onClick={() => void executeTrade()}>{busy ? <><RefreshCw className="spin" /> Processing…</> : <>Confirm & sign swap <ShieldCheck /></>}</button>}
              <p className="fine-print">Duba adadi da fees kafin sa hannu. Ba duk token ke da liquidity ko route ba.</p>
            </section>
            <section className="panel market-panel"><div className="panel-title"><div><h2>Token market</h2><p>Live Solana market data</p></div><BarChart3 className="muted-icon" /></div>
              {pair ? <><div className="market-summary"><div><small>{pair.baseToken.name} / {pair.quoteToken.symbol}</small><h3>{money(Number(pair.priceUsd))}</h3></div><span className="live-pill"><i /> LIVE</span></div><div className="market-stats"><div><small>Liquidity</small><b>{money(pair.liquidity?.usd)}</b></div><div><small>24h volume</small><b>{money(pair.volume?.h24)}</b></div><div><small>Market cap</small><b>{money(pair.marketCap ?? pair.fdv)}</b></div></div><div className="chart-frame"><iframe title="DexScreener chart" src={`https://dexscreener.com/solana/${pair.pairAddress}?embed=1&theme=dark&trades=0&info=0`} loading="lazy" allow="clipboard-write" /></div><a className="external-link" href={pair.url} target="_blank" rel="noreferrer">Open DexScreener <ExternalLink size={14} /></a></> : <div className="empty-market"><div className="chart-placeholder"><BarChart3 /></div><b>Search a token to view its chart</b><p>Shigar da sunan token ko mint address.</p></div>}
            </section>
          </div>
        </>}
        {tab === 'send' && <><div className="page-heading"><div><p className="eyebrow">TRANSFER ASSETS</p><h1>Send <em>crypto.</em></h1><p>Aika native SOL ko ETH zuwa wani wallet.</p></div></div><section className="panel send-panel"><div className="panel-title"><div><h2>Send assets</h2><p>Ka tabbatar network da address kafin ka aika.</p></div><Send className="muted-icon" /></div><label className="field-label">NETWORK</label><select className="full-select" value={sendChain} onChange={e => setSendChain(e.target.value as Chain)}><option value="solana">Solana · SOL</option><option value="ethereum">Ethereum · ETH</option><option value="base">Base · ETH</option></select><label className="field-label form-gap">RECIPIENT ADDRESS</label><div className="search-line"><input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder={sendChain === 'solana' ? 'Solana address' : '0x wallet address'} /><button className="search-button" onClick={() => { setScanMessage(''); setScanOpen(true); }} title="Scan QR"><Camera /></button></div><label className="field-label form-gap">AMOUNT ({sendChain === 'solana' ? 'SOL' : 'ETH'})</label><div className="amount-box"><input type="number" min="0" step="any" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" /><span className="asset-chip">{sendChain === 'solana' ? 'SOL' : 'ETH'}</span></div>{error && <div className="error-box">{error}</div>}{message && <div className="message-box">{message}</div>}<button className="primary trade-action" disabled={busy} onClick={() => void sendFunds()}>{busy ? <><RefreshCw className="spin" /> Sending…</> : <>Review and send <Send /></>}</button><p className="fine-print">Solana sends are confirmed on-chain. EVM sends require wallet approval; check explorer for final confirmation. Native assets only in this version.</p></section></>}
        {tab === 'receive' && <><div className="page-heading"><div><p className="eyebrow">YOUR RECEIVING DETAILS</p><h1>Receive <em>assets.</em></h1><p>Zaɓi network domin nuna address da QR code ɗinka.</p></div></div><section className="panel receive-panel"><label className="field-label">SELECT NETWORK</label><select className="full-select" value={receiveChain} onChange={e => setReceiveChain(e.target.value as Chain)}><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="base">Base</option></select><div className="qr-wrap">{qrValue ? <QRCodeSVG value={qrValue} size={210} bgColor="#ffffff" fgColor="#090d16" level="H" includeMargin /> : <div className="qr-empty"><QrCode /></div>}</div><h2>{receiveAddress ? short(receiveAddress) : 'Connect wallet'}</h2><p>{receiveAddress ? `Aika ${receiveChain === 'solana' ? 'SOL ko SPL token' : 'ETH ko supported token'} zuwa wannan address ta ${chainName[receiveChain]} network kawai.` : 'Ka haɗa wallet domin samun address.'}</p>{receiveAddress && <button className="primary" onClick={() => void copyText(receiveAddress)}><Copy size={16} />{copied ? 'Copied' : 'Copy address'}</button>}</section></>}
        {tab === 'markets' && <><div className="page-heading"><div><p className="eyebrow">SOLANA ECOSYSTEM</p><h1>Explore <em>markets.</em></h1><p>Nemo token ka duba chart da market metrics.</p></div></div><section className="panel market-search-panel"><div className="search-line large"><input value={mintInput} onChange={e => setMintInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void searchToken(); }} placeholder="Search token name, symbol or mint…" /><button className="search-button" onClick={() => void searchToken()} disabled={searching}>{searching ? <RefreshCw className="spin" /> : <Search />}</button></div>{pair && <div className="market-result"><div><b>{pair.baseToken.name} ({pair.baseToken.symbol})</b><small>{pair.baseToken.address}</small></div><strong>{money(Number(pair.priceUsd))}</strong><button className="secondary" onClick={addWatchlist}><Star /> Save</button><button className="primary" onClick={() => openTab('swap')}>Trade</button></div>}{error && <div className="error-box">{error}</div>}</section></>}
        {tab === 'portfolio' && <><div className="page-heading"><div><p className="eyebrow">ASSET HOLDINGS</p><h1>Your <em>portfolio.</em></h1><p>Native balances na networks da wallet ɗinka.</p></div></div><div className="portfolio-grid"><section className="panel"><h2>Solana</h2><p className="portfolio-value">{solBalance === null ? '—' : `${solBalance.toFixed(6)} SOL`}</p><small>{short(solAddress)}</small></section><section className="panel"><h2>Ethereum</h2><p className="portfolio-value">{evmBalance ?? '—'} ETH</p><small>{short(evmAddress)}</small></section><section className="panel"><h2>Base</h2><p className="portfolio-value">Balance available on network</p><small>{short(evmAddress)}</small></section></div><p className="fine-print left-note">Wannan bayani yana nuna native assets kawai. Cikakken SPL/ERC-20 token discovery zai buƙaci ƙarin token indexing.</p></>}
        {tab === 'activity' && <><div className="page-heading"><div><p className="eyebrow">ON-CHAIN RECORDS</p><h1>Wallet <em>activity.</em></h1><p>Transactions da aka yi a wannan browser session.</p></div></div><section className="panel activity-panel">{history.length ? history.map(item => <div className="activity-row" key={item.hash}><div className="activity-icon"><ArrowLeftRight /></div><div><b>{item.label}</b><small>{item.time} · {chainName[item.chain]}</small><a href={item.chain === 'solana' ? `https://solscan.io/tx/${item.hash}` : `https://${item.chain === 'base' ? 'basescan.org' : 'etherscan.io'}/tx/${item.hash}`} target="_blank" rel="noreferrer">{short(item.hash)} <ExternalLink size={12} /></a></div><span className="confirmed">{item.status}</span></div>) : <div className="empty-market"><Activity /><b>Babu transaction tukuna</b><p>Transactions da aka yi a wannan session za su bayyana a nan.</p></div>}</section></>}
        {tab === 'watchlist' && <><div className="page-heading"><div><p className="eyebrow">SAVED MARKETS</p><h1>Your <em>watchlist.</em></h1><p>Tokens da ka ajiye domin sa ido.</p></div></div><section className="panel">{watchlist.length ? watchlist.map(p => <div className="activity-row" key={p.pairAddress}><div className="token-avatar">{p.baseToken.symbol.slice(0,1)}</div><div><b>{p.baseToken.name} ({p.baseToken.symbol})</b><small>{short(p.baseToken.address)} · Liquidity {money(p.liquidity?.usd)}</small></div><strong>{money(Number(p.priceUsd))}</strong><button className="secondary" onClick={() => { setPair(p); setMintInput(p.baseToken.address); setTokenName(p.baseToken.name); setTokenSymbol(p.baseToken.symbol); openTab('swap'); }}>Trade</button></div>) : <div className="empty-market"><Star /><b>Watchlist ɗinka babu komai</b><p>Nemo token a Markets ka danna Save ko alamar tauraro.</p><button className="secondary" onClick={() => openTab('markets')}>Explore markets</button></div>}</section></>}
        {tab === 'profile' && <><div className="page-heading"><div><p className="eyebrow">ACCOUNT DETAILS</p><h1>Your <em>profile.</em></h1><p>Duba bayanan account da wallet addresses.</p></div></div><section className="panel profile-panel"><div className="profile-avatar large-avatar">{avatarUrl ? <img src={avatarUrl} /> : 'Y'}</div><label className="secondary upload-label">Upload avatar<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) setAvatarUrl(URL.createObjectURL(file)); }} /></label><label className="field-label form-gap">DISPLAY NAME</label><input className="profile-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" /><div className="profile-detail"><span>Email</span><b>{email || 'Not provided'}</b></div><div className="profile-detail"><span>Solana wallet</span><b>{short(solAddress)} <button className="copy-small" onClick={() => void copyText(solAddress)}><Copy /></button></b></div><div className="profile-detail"><span>EVM wallet (Ethereum / Base)</span><b>{short(evmAddress)} <button className="copy-small" onClick={() => void copyText(evmAddress)}><Copy /></button></b></div><div className="profile-detail"><span>Connected networks</span><b>Solana · Ethereum · Base</b></div><p className="fine-print left-note">Display name da avatar suna nan a wannan browser session; ba a haɗa cloud profile storage ba tukuna.</p></section></>}
        {tab === 'settings' && <><div className="page-heading"><div><p className="eyebrow">PREFERENCES & SECURITY</p><h1>Wallet <em>settings.</em></h1><p>Saitunan gani da wallet account.</p></div></div><section className="panel settings-panel"><div className="settings-row"><div><b>Hide balances</b><small>Ɓoye adadin wallet a dashboard.</small></div><button className={`toggle ${hideBalance ? 'on' : ''}`} onClick={() => setHideBalance(v => !v)}>{hideBalance ? 'ON' : 'OFF'}</button></div><div className="settings-row"><div><b>Default network</b><small>Zaɓi network da za a nuna a sama.</small></div><select className="settings-select" value={chain} onChange={e => setChain(e.target.value as Chain)}><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="base">Base</option></select></div><div className="settings-row"><div><b>Wallet security</b><small>Transactions suna buƙatar izinin wallet.</small></div><ShieldCheck className="muted-icon" /></div><div className="settings-row"><div><b>Connected account</b><small>{authenticated ? 'Wallet connected' : 'Not connected'}</small></div>{authenticated ? <button className="secondary" onClick={() => void logout()}>Disconnect</button> : <button className="primary" onClick={() => void login()}>Connect wallet</button>}</div></section></>}
        {scanOpen && <div className="modal-backdrop"><section className="panel scanner-modal"><div className="panel-title"><div><h2>Scan wallet QR</h2><p>Nuna QR code a camera.</p></div><button className="icon-button" onClick={() => setScanOpen(false)}><X /></button></div><div id={scannerElement} className="qr-scanner" />{scanMessage && <p className="fine-print">{scanMessage}</p>}<button className="secondary" onClick={() => setScanOpen(false)}>Close scanner</button></section></div>}
        <footer className="footer"><span>© {new Date().getFullYear()} YALO Wallet</span><a href={explorer} target="_blank" rel="noreferrer">Block Explorer <ExternalLink size={12} /></a><span>Privy · LI.FI · DexScreener</span></footer>
      </div>
    </main>
  </div>;
}
export default App;
