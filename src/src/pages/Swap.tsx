
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import {
  getLiFiQuote,
  type LiFiNetwork
} from "../lib/lifi";

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  network: LiFiNetwork;
}

const TOKENS: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    network: "ethereum"
  },
  {
    symbol: "ETH",
    name: "Base ETH",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    network: "base"
  },
  {
    symbol: "SOL",
    name: "Solana",
    address: "11111111111111111111111111111111",
    decimals: 9,
    network: "solana"
  }
];

function toSmallestUnit(
  amount: string,
  decimals: number
): string {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Enter a valid amount.");
  }

  const [whole, fraction = ""] = amount.split(".");

  if (fraction.length > decimals) {
    throw new Error("Too many decimal places.");
  }

  const result =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));

  if (result <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return result.toString();
}

function formatTokenAmount(
  amount: string,
  decimals: number
): string {
  const value = BigInt(amount);
  const divisor = 10n ** BigInt(decimals);

  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionalText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, 6)
    .replace(/0+$/, "");

  return fractionalText
    ? `${whole}.${fractionalText}`
    : whole.toString();
}

export default function Swap() {
  const { user } = useAuth();

  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);

  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function requestQuote() {
    setError("");
    setMessage("");
    setQuote(null);

    if (!user) {
      setError("Please sign in before using Swap.");
      return;
    }

    if (!amount.trim()) {
      setError("Enter the amount you want to swap.");
      return;
    }

    if (
      fromToken.network === toToken.network &&
      fromToken.address === toToken.address
    ) {
      setError("Choose two different tokens.");
      return;
    }

    try {
      setLoading(true);

      // Obtain the wallet address from the authenticated backend.
      const wallet = await fetch("/api/wallet/addresses", {
        credentials: "include"
      });

      if (!wallet.ok) {
        throw new Error("Unable to retrieve wallet address.");
      }

      const walletData = await wallet.json();

      const fromAddress =
        fromToken.network === "solana"
          ? walletData.solanaAddress
          : walletData.evmAddress;

      if (!fromAddress) {
        throw new Error(
          "A wallet address for the selected network is unavailable."
        );
      }

      const fromAmount = toSmallestUnit(
        amount,
        fromToken.decimals
      );

      const result = await getLiFiQuote({
        fromChain: fromToken.network,
        toChain: toToken.network,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount,
        fromAddress
      });

      setQuote(result);
      setMessage("Swap quote received successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to get Swap quote."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
    setError("");
    setMessage("");
  }

  const estimatedOutput =
    quote?.estimate?.toAmount && toToken
      ? formatTokenAmount(
          quote.estimate.toAmount,
          toToken.decimals
        )
      : null;

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white">

      <div className="mx-auto max-w-xl">

        <header className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#D4AF37]"
          >
            <ArrowLeft size={18} />
            Back to Wallet
          </Link>

          <span className="text-xl font-bold">
            YALO<span className="text-[#D4AF37]"> Wallet</span>
          </span>
        </header>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            Swap Assets
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Exchange digital assets across supported networks.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 shadow-2xl sm:p-7">

          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">
              Exchange
            </h2>

            <span className="flex items-center gap-2 text-xs text-green-400">
              <ShieldCheck size={15} />
              Quote preview
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080808] p-4">

            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="swap-amount"
                className="text-sm text-gray-400"
              >
                You pay
              </label>

              <span className="text-xs text-gray-500">
                {fromToken.network}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">

              <input
                id="swap-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setQuote(null);
                  setError("");
                }}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent text-3xl font-semibold outline-none"
              />

              <select
                value={`${fromToken.network}:${fromToken.symbol}`}
                onChange={(event) => {
                  const selected = TOKENS.find(
                    (token) =>
                      `${token.network}:${token.symbol}` ===
                      event.target.value
                  );

                  if (selected) {
                    setFromToken(selected);
                    setQuote(null);
                  }
                }}
                className="max-w-36 rounded-xl border border-white/10 bg-[#181818] px-3 py-3 text-sm text-white outline-none"
              >
                {TOKENS.map((token) => (
                  <option
                    key={`${token.network}:${token.symbol}`}
                    value={`${token.network}:${token.symbol}`}
                  >
                    {token.symbol} · {token.network}
                  </option>
                ))}
              </select>

            </div>
          </div>

          <div className="relative z-10 -my-3 flex justify-center">
            <button
              type="button"
              onClick={switchTokens}
              aria-label="Switch tokens"
              className="rounded-xl border border-[#D4AF37]/40 bg-[#17140B] p-3 text-[#D4AF37] transition hover:rotate-180"
            >
              <ArrowDown size={20} />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080808] p-4">

            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm text-gray-400">
                You receive
              </label>

              <span className="text-xs text-gray-500">
                {toToken.network}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="min-w-0 flex-1">
                <p className="text-3xl font-semibold">
                  {estimatedOutput || "—"}
                </p>

                {quote && (
                  <p className="mt-1 text-xs text-gray-500">
                    Estimated output
                  </p>
                )}
              </div>

              <select
                value={`${toToken.network}:${toToken.symbol}`}
                onChange={(event) => {
                  const selected = TOKENS.find(
                    (token) =>
                      `${token.network}:${token.symbol}` ===
                      event.target.value
                  );

                  if (selected) {
                    setToToken(selected);
                    setQuote(null);
                  }
                }}
                className="max-w-36 rounded-xl border border-white/10 bg-[#181818] px-3 py-3 text-sm text-white outline-none"
              >
                {TOKENS.map((token) => (
                  <option
                    key={`${token.network}:${token.symbol}`}
                    value={`${token.network}:${token.symbol}`}
                  >
                    {token.symbol} · {token.network}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {message && (
            <p className="mt-4 text-sm text-green-400">
              {message}
            </p>
          )}

          {quote && (
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-[#080808] p-4">

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-400">
                  Minimum received
                </span>

                <span>
                  {quote.estimate?.toAmountMin
                    ? formatTokenAmount(
                        quote.estimate.toAmountMin,
                        toToken.decimals
                      )
                    : "—"}{" "}
                  {toToken.symbol}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-400">
                  Estimated gas cost
                </span>

                <span>
                  {quote.estimate?.gasCosts?.[0]?.amount
                    ? quote.estimate.gasCosts[0].amount
                    : "See quote details"}
                </span>
              </div>

              <p className="text-xs leading-5 text-gray-500">
                This is an estimate, not a confirmed execution.
                Network fees and final output may change.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={requestQuote}
            disabled={loading || !amount.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-4 font-semibold text-black transition hover:bg-[#E5C45A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Getting quote...
              </>
            ) : (
              <>
                <ArrowLeftRight size={19} />
                Get Swap Quote
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-gray-500">
            Review the quote and network fees before approving
            any transaction.
          </p>

        </section>

        <p className="mt-6 text-center text-xs text-gray-600">
          YALO Wallet · Secure digital asset management
        </p>

      </div>
    </main>
  );
}
