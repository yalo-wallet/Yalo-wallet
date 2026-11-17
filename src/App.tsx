
import { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Activity, ArrowLeftRight, ArrowUpRight, Bell,
  Clock3, Command, LayoutDashboard, LineChart,
  LogOut, Menu, Settings, ShieldCheck, Sparkles, Wallet,
  X
} from 'lucide-react';
import type { AppSection, NavigationItem } from './types';

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'swap', label: 'Swap' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'activity', label: 'Activity' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'settings', label: 'Settings' }
];

const sectionDetails: Record<
  Exclude<AppSection, 'overview'>,
  { title: string; description: string }
> = {
  markets: {
    title: 'Markets',
    description: 'Live token discovery and market data integration.'
  },
  swap: {
    title: 'Swap',
    description: 'Cross-chain token swaps powered by Li.Fi. Coming Soon.'
  },
  portfolio: {
    title: 'Portfolio',
    description: 'Asset allocation, performance and profit/loss tracking.'
  },
  activity: {
    title: 'Activity',
    description: 'On-chain transaction history across supported networks.'
  },
  watchlist: {
    title: 'Watchlist',
    description: 'Track the assets you want to follow.'
  },
  settings: {
    title: 'Settings',
    description: 'Wallet preferences and account security.'
  }
};

function shortAddress(value?: string | null) {
  if (!value) return '';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export default function App() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [section, setSection] = useState<AppSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const walletAddresses = useMemo(() => {
    const linked = user?.linkedAccounts ?? [];

    return linked
      .filter((account) => account.type === 'wallet')
      .map((account) => ({
        address: 'address' in account ? account.address : '',
        chainType: 'chainType' in account ? account.chainType : 'wallet'
      }))
      .filter((item) => Boolean(item.address));
  }, [user]);

  const activeDetails =
    section === 'overview' ? null : sectionDetails[section];

  function selectSection(next: AppSection) {
    setSection(next);
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">Y</div>
          <div>
            <div className="brand-name">YALO</div>
            <div className="brand-caption">WALLET</div>
          </div>

          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon =
              item.id === 'overview'
                ? LayoutDashboard
                : item.id === 'markets'
                  ? LineChart
                  : item.id === 'swap'
                    ? ArrowLeftRight
                    : item.id === 'portfolio'
                      ? Wallet
                      : item.id === 'activity'
                        ? Activity
                        : item.id === 'watchlist'
                          ? Sparkles
                          : Settings;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  section === item.id ? 'nav-item-active' : ''
                }`}
                onClick={() => selectSection(item.id)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === 'overview' && (
                  <span className="active-indicator" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <strong>Self-custody first</strong>
              <p>Your keys stay under your control.</p>
            </div>
          </div>

          <div className="sidebar-footer">
            <span className="status-dot" />
            <span>YALO Wallet</span>
            <span className="version">v1.0</span>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="crumb-separator">/</span>
              <strong>{activeDetails?.title ?? 'Overview'}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="network-pill">
              <span className="status-dot" /> Mainnets
            </div>

            <button
              className="icon-button notification-button"
              aria-label="Notifications are coming soon"
              title="Coming Soon"
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>

            {authenticated ? (
              <div className="account-area">
                <div className="account-avatar">
                  {(user?.email?.address ?? 'Y').slice(0, 1).toUpperCase()}
                </div>

                <div className="account-meta">
                  <strong>
                    {user?.email?.address ?? 'Connected wallet'}
                  </strong>
                  <span>
                    {walletAddresses[0]?.address
                      ? shortAddress(walletAddresses[0].address)
                      : 'Authenticated'}
                  </span>
                </div>

                <button
                  className="icon-button"
                  onClick={() => void logout()}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={17} />
                </button>
              </div>
            ) : (
              <button
                className="button button-primary top-connect"
                disabled={!ready}
                onClick={login}
              >
                <Wallet size={16} /> Connect wallet
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          {section === 'overview' ? (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">YOUR WEB3 CONTROL CENTER</p>
                  <h1>
                    Welcome to <span>YALO.</span>
                  </h1>
                  <p className="page-subtitle">
                    One secure place to manage your digital assets.
                  </p>
                </div>

                <div className="welcome-date">
                  <Command size={15} /> Multi-chain wallet
                </div>
              </section>

              <section className="hero-card">
                <div className="hero-glow" />

                <div className="hero-content">
                  <div className="hero-label">
                    <span className="hero-label-dot" /> WALLET OVERVIEW
                  </div>

                  <h2>
                    {authenticated
                      ? 'Your wallet is connected.'
                      : 'Your assets. Your control.'}
                  </h2>

                  <p>
                    {authenticated
                      ? 'Your authentication is active. Connect and authorize the supported wallets to begin managing assets.'
                      : 'Connect securely to access your multi-chain wallet and trading tools.'}
                  </p>

                  {!authenticated && (
                    <button
                      className="button button-light"
                      disabled={!ready}
                      onClick={login}
                    >
                      <Wallet size={17} /> Connect wallet
                      <ArrowUpRight size={16} />
                    </button>
                  )}

                  <div className="hero-networks">
                    <span>
                      <i className="network-ethereum" /> Ethereum
                    </span>
                    <span>
                      <i className="network-base" /> Base
                    </span>
                    <span>
                      <i className="network-solana" /> Solana
                    </span>
                  </div>
                </div>

                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit-core">Y</div>
                  <div className="orbit-chip chip-one">ETH</div>
                  <div className="orbit-chip chip-two">SOL</div>
                  <div className="orbit-chip chip-three">BASE</div>
                </div>
              </section>

              <section className="section-heading">
                <div>
                  <h2>Wallet snapshot</h2>
                  <p>Live account information</p>
                </div>

                <span className="live-tag">
                  <span className="status-dot" /> Connected data only
                </span>
              </section>

              <section className="snapshot-grid">
                <article className="snapshot-card total-card">
                  <div className="card-topline">
                    <span>Total portfolio value</span>
                    <Wallet size={17} />
                  </div>
                  <div className="metric-value">
                    {authenticated ? '—' : '$—'}
                  </div>
                  <div className="metric-footnote">
                    Portfolio valuation will appear when wallet indexing is
                    connected.
                  </div>
                </article>

                <article className="snapshot-card">
                  <div className="card-topline">
                    <span>Ethereum</span>
                    <i className="network-ethereum" />
                  </div>
                  <div className="metric-value">
                    — <small>ETH</small>
                  </div>
                  <div className="metric-footnote">
                    Ethereum Mainnet · Balance unavailable
                  </div>
                </article>

                <article className="snapshot-card">
                  <div className="card-topline">
                    <span>Base</span>
                    <i className="network-base" />
                  </div>
                  <div className="metric-value">
                    — <small>ETH</small>
                  </div>
                  <div className="metric-footnote">
                    Base Mainnet · Balance unavailable
                  </div>
                </article>

                <article className="snapshot-card">
                  <div className="card-topline">
                    <span>Solana</span>
                    <i className="network-solana" />
                  </div>
                  <div className="metric-value">
                    — <small>SOL</small>
                  </div>
                  <div className="metric-footnote">
                    Solana Mainnet · Balance unavailable
                  </div>
                </article>
              </section>

              <section className="lower-grid">
                <article className="panel-card network-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Supported networks</h3>
                      <p>Available network environments</p>
                    </div>
                    <span className="panel-icon">
                      <LineChart size={17} />
                    </span>
                  </div>

                  <div className="network-row">
                    <span className="network-logo ethereum-logo">Ξ</span>
                    <div>
                      <strong>Ethereum</strong>
                      <small>Ethereum Mainnet</small>
                    </div>
                    <span className="network-state">Supported</span>
                  </div>

                  <div className="network-row">
                    <span className="network-logo base-logo">▰</span>
                    <div>
                      <strong>Base</strong>
                      <small>Base Mainnet</small>
                    </div>
                    <span className="network-state">Supported</span>
                  </div>

                  <div className="network-row">
                    <span className="network-logo solana-logo">◎</span>
                    <div>
                      <strong>Solana</strong>
                      <small>Solana Mainnet</small>
                    </div>
                    <span className="network-state">Supported</span>
                  </div>
                </article>

                <article className="panel-card activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent activity</h3>
                      <p>Your latest on-chain transactions</p>
                    </div>
                    <span className="panel-icon">
                      <Clock3 size={17} />
                    </span>
                  </div>

                  <div className="empty-state">
                    <div className="empty-icon">
                      <Activity size={20} />
                    </div>
                    <strong>No activity to display</strong>
                    <p>
                      Transaction history will appear after wallet indexing is
                      connected.
                    </p>
                  </div>
                </article>
              </section>

              <section className="integration-note">
                <div className="integration-note-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>Secure infrastructure</strong>
                  <p>
                    Authentication is powered by Privy. Market, portfolio and
                    transaction data will only be shown after their provider
                    integrations are connected.
                  </p>
                </div>
                <span className="integration-status">
                  Data services Coming Soon
                </span>
              </section>
            </>
          ) : (
            <section className="coming-page">
              <div className="coming-icon">
                {section === 'swap' ? (
                  <ArrowLeftRight size={25} />
                ) : section === 'activity' ? (
                  <Activity size={25} />
                ) : section === 'settings' ? (
                  <Settings size={25} />
                ) : (
                  <LineChart size={25} />
                )}
              </div>

              <p className="eyebrow">YALO WALLET</p>
              <h1>{activeDetails?.title}</h1>
              <p>{activeDetails?.description}</p>
              <span className="coming-badge">Coming Soon</span>
            </section>
          )}

          <footer className="page-footer">
            <span>© {new Date().getFullYear()} YALO Wallet</span>
            <span>
              <ShieldCheck size={13} /> Built for self-custody
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
