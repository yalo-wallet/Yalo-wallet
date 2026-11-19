import { useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface LoginResponse {
  message?: string;
}

interface VerifyResponse {
  message?: string;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    createdAt?: string;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<"email" | "otp">(
    "email"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const redirectTo =
    (location.state as { from?: { pathname?: string } })
      ?.from?.pathname || "/";

  async function requestOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post<LoginResponse>(
        "/api/auth/request-otp",
        {
          email: normalizedEmail
        }
      );

      setEmail(normalizedEmail);
      setStep("otp");

      setSuccess(
        response.message ||
          "If this email is eligible, a verification code will be sent."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request verification code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      await api.post<VerifyResponse>(
        "/api/auth/verify-otp",
        {
          email,
          otp
        }
      );

      await refreshUser();

      setSuccess("Login successful.");

      navigate(redirectTo, {
        replace: true
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendOTP() {
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await api.post<LoginResponse>(
        "/api/auth/request-otp",
        {
          email
        }
      );

      setSuccess(
        response.message ||
          "If this email is eligible, a new code will be sent."
      );

      setOtp("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend verification code."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10">
            <span className="text-3xl font-bold text-[#D4AF37]">
              Y
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-wide">
            YALO<span className="text-[#D4AF37]"> Wallet</span>
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            Your digital assets, under your control.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl sm:p-8">

          <h2 className="text-xl font-semibold">
            {step === "email"
              ? "Welcome back"
              : "Verify your email"}
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            {step === "email"
              ? "Enter your email to receive a verification code."
              : `Enter the 6-digit code sent to ${email}.`}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400"
            >
              {success}
            </div>
          )}

          {step === "email" ? (
            <form
              onSubmit={requestOTP}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Gmail / Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@gmail.com"
                  className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold text-black transition hover:bg-[#E5C45A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Sending code..."
                  : "Continue with Email"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={verifyOTP}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Verification code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="000000"
                  className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none transition focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold text-black transition hover:bg-[#E5C45A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Verifying..."
                  : "Verify and Sign In"}
              </button>

              <button
                type="button"
                onClick={resendOTP}
                disabled={loading}
                className="w-full py-2 text-sm text-[#D4AF37] hover:underline disabled:opacity-50"
              >
                Resend verification code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                  setSuccess("");
                }}
                className="w-full py-2 text-sm text-gray-400 hover:text-white"
              >
                Change email address
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-white/10 pt-5 text-center">
            <p className="text-xs leading-5 text-gray-500">
              Never share your verification code with anyone.
              YALO Wallet will never ask for your recovery phrase
              through email.
            </p>
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-[#D4AF37]"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} YALO Wallet.
          All rights reserved.
        </p>
      </div>
    </main>
  );
        }
            
