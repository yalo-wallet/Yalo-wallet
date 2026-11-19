
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  ExternalLink,
  History
} from "lucide-react";

import { api } from "../lib/api";

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "swap";

type TransactionStatus =
  | "pending"
  | "completed"
  | "failed";

interface WalletTransaction {
  id: string;
  type: TransactionType;
  network: "ethereum" | "base" | "solana";
  symbol: string;
  amount: string;
  status: TransactionStatus;
  txHash?: string;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: WalletTransaction[];
}

const TYPE_DETAILS = {
  deposit: {
    label: "Received",
    icon: ArrowDownLeft,
    color: "text-green-400",
    sign: "+"
  },
  withdrawal: {
    label: "Sent",
    icon: ArrowUpRight,
    color: "text-red-400",
    sign: "-"
  },
  swap: {
    label: "Swap",
    icon: ArrowLeftRight,
    color: "text-[#D4AF37]",
    sign: ""
  }
};

const STATUS_STYLES = {
  pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  completed: "border-green-500/30 bg-green-500/10 text-green-400",
  failed: "border-red-500/30 bg-red-500/10 text-red-400"
};

const EXPLORERS = {
  ethereum: "https://etherscan.io/tx/",
  base: "https://basescan.org/tx/",
  solana: "https://solscan.io/tx/"
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<
    WalletTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<
    "all" | TransactionType
  >("all");

  async function loadTransactions(isRefresh = false) {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get<TransactionsResponse>(
        "/api/transactions"
      );

      setTransactions(
        Array.isArray(response.transactions)
          ? response.transactions
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load transaction history."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  const filteredTransactions = transactions.filter(
    (transaction) =>
      filter === "all" || transaction.type === filter
  );

  function formatDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleString();
  }

  function shortenHash(hash: string) {
    if (hash.length < 18) return hash;

    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  function getExplorerUrl(
    network: WalletTransaction["network"],
    hash: string
  ) {
    return `${EXPLORERS[network]}${encodeURIComponent(hash)}`;
  }

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white">

      <div className="mx-auto max-w-5xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#D4AF37]"
            >
              <ArrowLeft size={17} />
              Back to Wallet
            </Link>

            <h1 className="text-3xl font-bold">
              Transaction History
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Track your wallet activity across supported networks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadTransactions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-[#D4AF37] hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <section className="mb-6 flex flex-wrap gap-2">

          {[
            { value: "all", label: "All" },
            { value: "deposit", label: "Received" },
            { value: "withdrawal", label: "Sent" },
            { value: "swap", label: "Swaps" }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilter(
                  item.value as "all" | TransactionType
                )
              }
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                filter === item.value
                  ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                  : "border-white/10 bg-[#111111] text-gray-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <History
                size={21}
                className="text-[#D4AF37]"
              />

              <h2 className="font-semibold">
                Activity
              </h2>
            </div>

            <span className="text-xs text-gray-500">
              {filteredTransactions.length} transactions
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-white/5"
                />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <History
                size={40}
                className="mx-auto text-gray-600"
              />

              <h3 className="mt-4 font-semibold">
                No transactions found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Your transaction activity will appear here
                when available.
              </p>

              <Link
                to="/"
                className="mt-5 inline-block text-sm text-[#D4AF37] hover:underline"
              >
                Return to Wallet
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {filteredTransactions.map((transaction) => {
                const details = TYPE_DETAILS[transaction.type];
                const Icon = details.icon;

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-white/[0.02]"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        <Icon
                          size={21}
                          className={details.color}
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {details.label}
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          {transaction.network} · {formatDate(transaction.createdAt)}
                        </p>

                        {transaction.txHash && (
                          <a
                            href={getExplorerUrl(
                              transaction.network,
                              transaction.txHash
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-[#D4AF37] hover:underline"
                          >
                            {shortenHash(transaction.txHash)}
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                    </div>

                    <div className="text-right">
                      <p className={`font-semibold ${details.color}`}>
                        {details.sign}
                        {transaction.amount} {transaction.symbol}
                      </p>

                      <span
                        className={`mt-2 inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLES[transaction.status]}`}
                      >
                        {transaction.status}
                      </span>
                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        <footer className="mt-8 border-t border-white/10 py-6 text-center">
          <p className="text-xs text-gray-600">
            YALO Wallet · Transaction records
          </p>
        </footer>

      </div>
    </main>
  );
}
