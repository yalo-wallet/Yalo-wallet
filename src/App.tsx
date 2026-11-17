import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, formatEther, http } from 'viem';
import { mainnet, base } from 'viem/chains';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { AppSection, NavigationItem } from './types';

type WalletAccount = {
  type?: string;
  chainType?: string;
  address?: string;
};

type Prices = {
  ethereum: number;
  solana: number;
};

type Balances = {
  ethereum: number;
  base: number;
  solana: number;
};

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com'),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

const solanaConnection = new Connection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
);

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'swap', label: 'Swap' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'activity', label: 'Activity' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'settings', label: 'Settings' },
];

const navIcons = {
  overview: LayoutDashboard,
  markets: LineChart,
  swap: ArrowLeftRight,
  portfolio: Wallet,
  activity: Activity,
  watchlist: Eye,
  settings: Settings,
};

const formatUSD = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatToken = (value: number, digits = 5) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);

function shortenAddress(address?: string) {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function App() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [section, setSection] = useState<AppSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [prices, setPrices] = useState<Prices>({
    ethereum: 0,
    solana: 0,
  });

  const [balances, setBalances] = useState<Balances>({
    ethereum: 0,
    base: 0,
    solana: 0,
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const accounts = useMemo(
    () => (user?.linkedAccounts ?? []) as WalletAccount[],
    [user]
  );

  const walletAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.type === 'wallet' && Boolean(account.address)
      ),
    [accounts]
  );

  const ethereumAddress = useMemo(
    () =>
      walletAccounts.find(
        (account) =>
          account.chainType === 'ethereum' &&
          account.address?.startsWith('0x')
      )?.address ??
      walletAccounts.find((account) => account.address?.startsWith('0x'))
        ?.address ??
      '',
    [walletAccounts]
  );

  const solanaAddress = useMemo(
    () =>
      walletAccounts.find(
        (account) =>
          account.chainType === 'solana' &&
          Boolean(account.address) &&
          !account.address?.startsWith('0x')
      )?.address ??
      walletAccounts.find(
        (account) =>
          Boolean(account.address) && !account.address?.startsWith('0x')
      )?.address ??
      '',
    [walletAccounts]
  );

  const loadPrices = useCallback(async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana&vs_currencies=usd'
      );

      if (!response.ok) throw new Error('Price service unavailable');

      const data: {
        ethereum?: { usd?: number };
        solana?: { usd?: number };
      } = await response.json();

      setPrices({
        ethereum: Number(data.ethereum?.usd ?? 0),
        solana: Number(data.solana?.usd ?? 0),
      });
    } catch {
      setError('Market prices could not be refreshed.');
    }
  }, []);

  const loadBalances = useCallback(async () => {
    if (!authenticated) {
      setBalances({ ethereum: 0, base: 0, solana: 0 });
      setLastUpdated(null);
      return;
    }

    if (!ethereumAddress && !solanaAddress) {
      setBalances({ ethereum: 0, base: 0, solana: 0 });
      setError('No supported wallet address was found in your Privy account.');
      return;
    }

    setLoading(true);
    setError('');

    const next: Balances = {
      ethereum: 0,
      base: 0,
      solana: 0,
    };

    const failures: string[] = [];

    if (ethereumAddress) {
      try {
        const address = ethereumAddress as `0x${string}`;
        const [ethBalance, baseBalance] = await Promise.all([
          ethereumClient.getBalance({ address }),
          baseClient.getBalance({ address }),
        ]);

        next.ethereum = Number(formatEther(ethBalance));
        next.base = Number(formatEther(baseBalance));
      } catch {
        failures.push('Ethereum/Base');
      }
    }

    if (solanaAddress) {
      try {
        const publicKey = new PublicKey(solanaAddress);
        const lamports = await solanaConnection.getBalance(publicKey);
        next.solana = lamports / LAMPORTS_PER_SOL;
      } catch {
        failures.push('Solana');
      }
    }

    setBalances(next);
    setLastUpdated(new Date());

    if (failures.length > 0) {
      setError(`Could not refresh ${failures.join(' and ')} balance.`);
    }

    setLoading(false);
  }, [authenticated, ethereumAddress, solanaAddress]);

  useEffect(() => {
    if (!authenticated) {
      setBalances({ ethereum: 0, base: 0, solana: 0 });
      setLastUpdated(null);
      return;
    }

    void loadPrices();
    void loadBalances();

    const priceTimer = window.setInterval(() => {
      void loadPrices();
    }, 60000);

    const balanceTimer = window.setInterval(() => {
      void loadBalances();
    }, 45000);

    return () => {
      window.clearInterval(priceTimer);
      window.clearInterval(balanceTimer);
    };
  }, [authenticated, loadPrices, loadBalances]);

  const totalValue =
    balances.ethereum * prices.ethereum +
    balances.base * prices.ethereum +
    balances.solana * prices.solana;

  const handleCopy = async (address: string) => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Unable to copy address on this device.');
    }
  };

  const handleNavigation = (id: AppSection) => {
    setSection(id);
    setSidebarOpen(false);
  };

  const maskedValue = (value: string) => (hidden ? '••••••••' : value);

  const renderOverview = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">WALLET OVERVIEW</p>
          <h1>Your assets, <span>in control.</span></h1>
          <p className="page-subtitle">
            Your multi-chain wallet at a glance.
          </p>
        </div>
        <button
          className="welcome-date"
          onClick={() => {
            void loadBalances();
            void loadPrices();
          }}
          disabled={loading}
        >
          <RefreshCw size={13} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <section className="hero-card">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-label">
            <span className="hero-label-dot" />
            YALO MULTI-CHAIN WALLET
          </div>
          <h2>One wallet. Three networks.</h2>
          <p>
            Manage your Ethereum, Base and Solana assets from one wallet
            interface.
          </p>
          {!authenticated ? (
            <button className="button button-light" onClick={login}>
              <Wallet size={15} />
              Connect wallet
            </button>
          ) : (
            <button
              className="button button-light"
              onClick={() => setSection('portfolio')}
            >
              View portfolio
              <ArrowUpRight size={15} />
            </button>
          )}
          <div className="hero-networks">
            <span><i className="network-ethereum" /> Ethereum</span>
            <span><i className="network-base" /> Base</span>
            <span><i className="network-solana" /> Solana</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">Y</div>
          <span className="orbit-chip chip-one">ETH</span>
          <span className="orbit-chip chip-two">SOL</span>
          <span className="orbit-chip chip-three">BASE</span>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h2>Portfolio snapshot</h2>
          <p>Native assets across connected networks</p>
        </div>
        <button
          className="icon-button"
          aria-label="Hide or show balance"
          onClick={() => setHidden((value) => !value)}
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="snapshot-grid">
        <div className="snapshot-card total-card">
          <div className="card-topline">
            <span>Total portfolio value</span>
            <Wallet size={15} />
          </div>
          <div className="metric-value">
            {authenticated ? maskedValue(formatUSD(totalValue)) : '—'}
          </div>
          <div className="metric-footnote">
            {authenticated
              ? 'ETH and SOL native balances'
              : 'Connect your wallet to view your assets'}
          </div>
        </div>

        <div className="snapshot-card">
          <div className="card-topline">
            <span>Ethereum</span>
            <span className="network-ethereum" />
          </div>
          <div className="metric-value">
            {authenticated
              ? maskedValue(`${formatToken(balances.ethereum)} ETH`)
              : '—'}
          </div>
          <div className="metric-footnote">
            {prices.ethereum
              ? formatUSD(balances.ethereum * prices.ethereum)
              : 'Price unavailable'}
          </div>
        </div>

        <div className="snapshot-card">
          <div className="card-topline">
            <span>Base</span>
            <span className="network-base" />
          </div>
          <div className="metric-value">
            {authenticated
              ? maskedValue(`${formatToken(balances.base)} ETH`)
              : '—'}
          </div>
          <div className="metric-footnote">
            {prices.ethereum
              ? formatUSD(balances.base * prices.ethereum)
              : 'Price unavailable'}
          </div>
        </div>

        <div className="snapshot-card">
          <div className="card-topline">
            <span>Solana</span>
            <span className="network-solana" />
          </div>
          <div className="metric-value">
            {authenticated
              ? maskedValue(`${formatToken(balances.solana)} SOL`)
              : '—'}
          </div>
          <div className="metric-footnote">
            {prices.solana
              ? formatUSD(balances.solana * prices.solana)
              : 'Price unavailable'}
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="metric-footnote"
          style={{ color: '#e6a18e', marginTop: 12 }}
        >
          {error}
        </p>
      )}

      <div className="lower-grid">
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <h3>Connected networks</h3>
              <p>Native wallet balances</p>
            </div>
            <div className="panel-icon"><ShieldCheck size={16} /></div>
          </div>

          <div className="network-row">
            <span className="network-logo ethereum-logo">◆</span>
            <div>
              <strong>Ethereum</strong>
              <small>{authenticated ? `${formatToken(balances.ethereum)} ETH` : 'Wallet not connected'}</small>
            </div>
            <span className="network-state">
              {ethereumAddress ? 'Connected' : 'Not connected'}
            </span>
          </div>

          <div className="network-row">
            <span className="network-logo base-logo">◉</span>
            <div>
              <strong>Base</strong>
              <small>{authenticated ? `${formatToken(balances.base)} ETH` : 'Wallet not connected'}</small>
            </div>
            <span className="network-state">
              {ethereumAddress ? 'Connected' : 'Not connected'}
            </span>
          </div>

          <div className="network-row">
            <span className="network-logo solana-logo">◎</span>
            <div>
              <strong>Solana</strong>
              <small>{authenticated ? `${formatToken(balances.solana)} SOL` : 'Wallet not connected'}</small>
            </div>
            <span className="network-state">
              {solanaAddress ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <h3>Wallet addresses</h3>
              <p>Your connected wallet accounts</p>
            </div>
            <div className="panel-icon"><Wallet size={16} /></div>
          </div>

          {!authenticated ? (
            <div className="empty-state">
              <div className="empty-icon"><Wallet size={18} /></div>
              <strong>No wallet connected</strong>
              <p>Connect your wallet to see your addresses.</p>
            </div>
          ) : (
            <>
              {ethereumAddress && (
                <div className="network-row">
                  <div>
                    <strong>Ethereum / Base</strong>
                    <small>{shortenAddress(ethereumAddress)}</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Copy EVM address"
                    onClick={() => void handleCopy(ethereumAddress)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              {solanaAddress && (
                <div className="network-row">
                  <div>
                    <strong>Solana</strong>
                    <small>{shortenAddress(solanaAddress)}</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Copy Solana address"
                    onClick={() => void handleCopy(solanaAddress)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              {!ethereumAddress && !solanaAddress && (
                <div className="empty-state">
                  <strong>No wallet addresses found</strong>
                  <p>Check your Privy wallet account setup.</p>
                </div>
              )}
            </>
          )}

          {copied && (
            <p className="metric-footnote" style={{ color: '#78c6a4' }}>
              <Check size={12} /> Address copied
            </p>
          )}
        </section>
      </div>

      <div className="integration-note">
        <div className="integration-note-icon"><Clock3 size={18} /></div>
        <div>
          <strong>Last balance update</strong>
          <p>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for wallet data'}</p>
        </div>
        <span className={`integration-status ${authenticated ? 'configured' : ''}`}>
          {authenticated ? 'Wallet connected' : 'Not connected'}
        </span>
      </div>
    </>
  );

  const renderMarkets = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">MARKET DATA</p>
          <h1>Market <span>prices.</span></h1>
          <p className="page-subtitle">Live reference prices for supported native assets.</p>
        </div>
        <button className="icon-button" onClick={() => void loadPrices()} aria-label="Refresh prices">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="snapshot-grid">
        <div className="snapshot-card">
          <div className="card-topline">Ethereum <span className="network-ethereum" /></div>
          <div className="metric-value">{prices.ethereum ? formatUSD(prices.ethereum) : '—'}</div>
          <div className="metric-footnote">ETH / USD</div>
        </div>
        <div className="snapshot-card">
          <div className="card-topline">Solana <span className="network-solana" /></div>
          <div className="metric-value">{prices.solana ? formatUSD(prices.solana) : '—'}</div>
          <div className="metric-footnote">SOL / USD</div>
        </div>
      </div>
      <div className="integration-note">
        <LineChart size={18} />
        <div>
          <strong>Market data</strong>
          <p>Prices are retrieved from CoinGecko. Historical charts and additional assets are not yet connected.</p>
        </div>
      </div>
    </>
  );

  const renderPortfolio = () => (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">YOUR ASSETS</p>
          <h1>My <span>portfolio.</span></h1>
          <p className="page-subtitle">Native ETH and SOL balances across your connected networks.</p>
        </div>
        <button className="icon-button" onClick={() => void loadBalances()} disabled={loading} aria-label="Refresh balances">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="snapshot-grid">
        <div className="snapshot-card total-card">
          <div className="card-topline">Total value <Wallet size={15} /></div>
          <div className="metric-value">{authenticated ? formatUSD(totalValue) : '—'}</div>
          <div className="metric-footnote">Native assets only</div>
        </div>
        <div className="snapshot-card">
          <div className="card-topline">Ethereum</div>
          <div className="metric-value">{authenticated ? `${formatToken(balances.ethereum)} ETH` : '—'}</div>
          <div className="metric-footnote">{formatUSD(balances.ethereum * prices.ethereum)}</div>
        </div>
        <div className="snapshot-card">
          <div className="card-topline">Base</div>
          <div className="metric-value">{authenticated ? `${formatToken(balances.base)} ETH` : '—'}</div>
          <div className="metric-footnote">{formatUSD(balances.base * prices.ethereum)}</div>
        </div>
        <div className="snapshot-card">
          <div className="card-topline">Solana</div>
          <div className="metric-value">{authenticated ? `${formatToken(balances.solana)} SOL` : '—'}</div>
          <div className="metric-footnote">{formatUSD(balances.solana * prices.solana)}</div>
        </div>
      </div>
      <div className="integration-note">
        <Wallet size={18} />
        <div>
          <strong>Native asset balances</strong>
          <p>ERC-20 and SPL token discovery has not yet been implemented.</p>
        </div>
      </div>
    </>
  );

  const renderComingSoon = (title: string, description: string) => (
    <div className="coming-page">
      <div className="coming-icon"><Sparkles size={25} /></div>
      <p className="eyebrow">YALO WALLET</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="coming-badge">COMING SOON</span>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'overview':
        return renderOverview();
      case 'markets':
        return renderMarkets();
      case 'portfolio':
        return renderPortfolio();
      case 'swap':
        return renderComingSoon('Cross-chain swap', 'Swap execution through Li.FI is not connected yet.');
      case 'activity':
        return renderComingSoon('Transaction activity', 'On-chain transaction history is not connected yet.');
      case 'watchlist':
        return renderComingSoon('Watchlist', 'Token watchlist functionality is not implemented yet.');
      case 'settings':
        return (
          <>
            <div className="welcome-row">
              <div>
                <p className="eyebrow">PREFERENCES</p>
                <h1>Wallet <span>settings.</span></h1>
                <p className="page-subtitle">Your account and connected addresses.</p>
              </div>
            </div>
            <section className="panel-card">
              <div className="panel-heading">
                <div>
                  <h3>Account</h3>
                  <p>Privy authentication</p>
                </div>
                <ShieldCheck size={18} />
              </div>
              <div className="network-row">
                <div>
                  <strong>Status</strong>
                  <small>{authenticated ? 'Authenticated' : 'Not connected'}</small>
                </div>
              </div>
              {ethereumAddress && (
                <div className="network-row">
                  <div>
                    <strong>Ethereum / Base</strong>
                    <small>{ethereumAddress}</small>
                  </div>
                  <button className="icon-button" onClick={() => void handleCopy(ethereumAddress)} aria-label="Copy EVM address">
                    <Copy size={14} />
                  </button>
                </div>
              )}
              {solanaAddress && (
                <div className="network-row">
                  <div>
                    <strong>Solana</strong>
                    <small>{solanaAddress}</small>
                  </div>
                  <button className="icon-button" onClick={() => void handleCopy(solanaAddress)} aria-label="Copy Solana address">
                    <Copy size={14} />
                  </button>
                </div>
              )}
              {authenticated && (
                <button className="button button-primary" onClick={() => void logout()}>
                  <LogOut size={15} />
                  Disconnect wallet
                </button>
              )}
            </section>
          </>
        );
      default:
        return renderOverview();
    }
  };

  if (!ready) {
    return (
      <main className="config-screen">
        <div className="brand-mark">Y</div>
        <p className="eyebrow">YALO WALLET</p>
        <h1>Loading wallet</h1>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">Y</div>
          <div>
            <div className="brand-name">YALO</div>
            <div className="brand-caption">WALLET</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        <div className="nav-label">MENU</div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = navIcons[item.id];
            return (
              <button
                key={item.id}
                className={`nav-item ${section === item.id ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {section === item.id && <i className="active-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-icon"><ShieldCheck size={19} /></div>
            <div>
              <strong>Wallet security</strong>
              <p>Your wallet keys are managed by Privy.</p>
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            <span>{authenticated ? 'Wallet connected' : 'Wallet disconnected'}</span>
            <span className="version">V3.0</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={19} />
            </button>
            <span>YALO</span>
            <span className="crumb-separator">/</span>
            <strong>{navigation.find((item) => item.id === section)?.label}</strong>
          </div>

          <div className="topbar-actions">
            <div className="network-pill">
              <span className="status-dot" />
              Ethereum · Base · Solana
            </div>
            <button className="icon-button" aria-label="Help">
              <CircleHelp size={17} />
            </button>
            <div className="account-area">
              <div className="account-avatar">
                {authenticated ? 'Y' : <Wallet size={15} />}
              </div>
              <div className="account-meta">
                <strong>{authenticated ? shortenAddress(ethereumAddress || solanaAddress) : 'Guest wallet'}</strong>
                <span>{authenticated ? 'Connected' : 'Not connected'}</span>
              </div>
              {authenticated ? (
                <button className="icon-button" onClick={() => void logout()} aria-label="Disconnect wallet">
                  <LogOut size={15} />
                </button>
              ) : (
                <button className="button button-primary" onClick={login}>
                  Connect
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {renderContent()}
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} YALO Wallet</span>
            <span><ShieldCheck size={12} /> Non-custodial wallet interface</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
