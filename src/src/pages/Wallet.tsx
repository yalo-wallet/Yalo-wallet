
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  History,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck
} from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import AnnouncementBanner from "../components/AnnouncementBanner";

interface WalletAsset {
  network: "ethereum" | "base" | "solana";
  symbol: string;
  name: string;
  balance: string;
  address: string;
  usdValue?: number;
}

interface WalletResponse {
  assets: WalletAsset[];
  totalUsdValue?: number;
}

const NETWORK_NAMES = {
  ethereum: "Ethereum",
  base: "Base",
  solana: "Solana"
};

const NETWORK_COLORS = {
  ethereum: "text-blue-400",
  base: "text-sky-400",
  solana: "text-purple-400"
};

export default function Wallet() {
  const { user, logout } = useAuth();

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [totalUsd, setTotalUsd] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const [error, setError] = useState("");
  const [copiedAddress, setCopiedAddress] = useState("");

  async function loadWallet(isRefresh = false) {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get<WalletResponse>(
        "/api/wallet"
      );

      setAssets(
        Array.isArray(response.assets)
          ? response.assets
          : []
      );

      setTotalUsd(
        typeof response.totalUsdValue === "number"
          ? response.totalUsdValue
          : null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load wallet information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadWallet();
  }, []);

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);

      window.setTimeout(() => {
        setCopiedAddress("");
      }, 2000);
    } catch {
      setError("Unable to copy address.");
    }
  }

  function formatBalance(balance: string) {
    const value = Number(balance);

    if (!Number.isFinite(value)) return "0";

    return value.toLocaleString(undefined, {
      maximumFractionDigits: 6
    });
  }

  function formatUSD(value?: number) {
    if (typeof value !== "number") return "—";

    return value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    });
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      setError("Logout failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">

          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10">
              <WalletIcon className="text-[#D4AF37]" size={22} />
            </div>

            <span className="text-xl font-bold">
              YALO<span className="text-[#D4AF37]"> Wallet</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-gray-500">
                Signed in as
              </p>
              <p className="max-w-40 truncate text-sm text-gray-300">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-lg border border-white/10 p-2 text-gray-400 hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">

        <AnnouncementBanner />

        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Welcome back
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              My Wallet
            </h1>
          </div>

          <button
            type="button"
            onClick={() => loadWallet(true)}
            disabled={refreshing}
            aria-label="Refresh wallet"
            className="rounded-xl border border-white/10 p-3 text-[#D4AF37] hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={19}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#201B0D] via-[#14120D] to-[#090909] p-6 sm:p-9">

          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-400">
                Total portfolio value
              </p>

              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                aria-label="Toggle balance visibility"
                className="text-gray-400 hover:text-[#D4AF37]"
              >
                {showBalance ? (
                  <Eye size={17} />
                ) : (
                  <EyeOff size={17} />
                )}
              </button>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="h-12 w-48 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {showBalance
                    ? formatUSD(totalUsd ?? undefined)
                    : "••••••••"}
                </h2>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Estimated value in USD
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">

              <Link
                to="/receive"
                className="flex flex-col items-center gap-2 rounded-xl bg-[#D4AF37] px-3 py-4 text-black transition hover:bg-[#E5C45A]"
              >
                <ArrowDownToLine size={21} />
                <span className="text-sm font-semibold">
                  Receive
                </span>
              </Link>

              <Link
                to="/send"
                className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10"
              >
                <ArrowUpFromLine size={21} />
                <span className="text-sm font-semibold">
                  Send
                </span>
              </Link>

              <Link
                to="/swap"
                className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10"
              >
                <ArrowLeftRight size={21} />
                <span className="text-sm font-semibold">
                  Swap
                </span>
              </Link>

            </div>
          </div>
        </section>

        <section className="mt-9">

          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Your Assets
            </h2>

            <span className="text-xs text-gray-500">
              {assets.length} assets
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5"
                />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-8 text-center">
              <WalletIcon
                size={34}
                className="mx-auto text-[#D4AF37]"
              />

              <h3 className="mt-4 font-semibold">
                Your wallet is ready
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Your supported network balances will appear here
                when wallet data is available.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset, index) => (
                <div
                  key={`${asset.network}-${asset.address}-${index}`}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-4 transition hover:border-[#D4AF37]/30 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        <span className={`text-lg font-bold ${NETWORK_COLORS[asset.network]}`}>
                          {asset.network === "ethereum"
                            ? "Ξ"
                            : asset.network === "base"
                              ? "B"
                              : "◎"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {asset.name}
                        </h3>

                        <p className="text-xs text-gray-500">
                          {NETWORK_NAMES[asset.network]} · {asset.symbol}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {showBalance
                          ? `${formatBalance(asset.balance)} ${asset.symbol}`
                          : "••••••"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {showBalance
                          ? formatUSD(asset.usdValue)
                          : "••••"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                    <p className="min-w-0 truncate text-xs text-gray-500">
                      {asset.address}
                    </p>

                    <button
                      type="button"
                      onClick={() => copyAddress(asset.address)}
                      aria-label="Copy wallet address"
                      className="shrink-0 text-[#D4AF37] hover:text-white"
                    >
                      {copiedAddress === asset.address ? (
                        <span className="text-xs">Copied</span>
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9 grid gap-4 sm:grid-cols-2">

          <Link
            to="/transactions"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111111] p-5 transition hover:border-[#D4AF37]/40"
          >
            <div className="flex items-center gap-3">
              <History className="text-[#D4AF37]" size={22} />

              <div>
                <h3 className="font-semibold">
                  Transactions
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  View your activity
                </p>
              </div>
            </div>

            <ExternalLink size={17} className="text-gray-500" />
          </Link>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111111] p-5">
            <ShieldCheck className="text-[#D4AF37]" size={23} />

            <div>
              <h3 className="font-semibold">
                Self-custody
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Your keys stay under your control
              </p>
            </div>
          </div>

        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} YALO Wallet
          </p>
        </footer>

      </div>
    </main>
  );
      }
                    
