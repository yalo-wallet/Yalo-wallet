
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!requiresTwoFactor) {
        const result = await api.post<{
          requiresTwoFactor: boolean;
          authenticated?: boolean;
        }>("/api/admin/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        });

        if (result.requiresTwoFactor) {
          setRequiresTwoFactor(true);
          setPassword("");
        } else if (result.authenticated) {
          navigate("/admin", { replace: true });
        } else {
          setError("Ba a tabbatar da shiga ba. Gwada kuma.");
        }
      } else {
        const result = await api.post<{
          authenticated: boolean;
        }>("/api/admin/auth/verify", {
          email: email.trim().toLowerCase(),
          code: twoFactorCode.trim(),
        });

        if (result.authenticated) {
          navigate("/admin", { replace: true });
        } else {
          setError("Lambar tabbatarwa ba daidai ba ce.");
        }
      }
    } catch {
      setError(
        "An kasa shiga. Duba bayananka ko ka sake gwadawa."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c9a64b]/40 bg-[#c9a64b]/10 text-3xl text-[#d6b65d]">
            Y
          </div>

          <h1 className="text-3xl font-bold tracking-wide">
            YALO <span className="text-[#d6b65d]">ADMIN</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Secure administration access
          </p>
        </div>

        <div className="rounded-2xl border border-[#c9a64b]/20 bg-[#111111] p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">
            {requiresTwoFactor
              ? "Two-Factor Verification"
              : "Administrator Login"}
          </h2>

          <p className="mt-2 mb-6 text-sm text-gray-400">
            {requiresTwoFactor
              ? "Enter the verification code from your authenticator."
              : "Sign in using your authorized administrator credentials."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!requiresTwoFactor ? (
              <>
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm text-gray-300"
                  >
                    Admin Email
                  </label>

                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#c9a64b]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm text-gray-300"
                  >
                    Password
                  </label>

                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter admin password"
                    className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#c9a64b]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label
                  htmlFor="admin-code"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Authentication Code
                </label>

                <input
                  id="admin-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={8}
                  value={twoFactorCode}
                  onChange={(event) =>
                    setTwoFactorCode(
                      event.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="Enter verification code"
                  className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-center text-xl tracking-[0.3em] text-white outline-none focus:border-[#c9a64b]"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#c9a64b] px-4 py-3 font-semibold text-black transition hover:bg-[#dfc16e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : requiresTwoFactor
                  ? "Verify & Continue"
                  : "Secure Login"}
            </button>

            {requiresTwoFactor && (
              <button
                type="button"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setError("");
                }}
                className="w-full text-sm text-gray-400 hover:text-[#d6b65d]"
              >
                Back to login
              </button>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Protected administrator access · YALO Wallet
        </p>
      </section>
    </main>
  );
}
