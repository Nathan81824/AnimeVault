import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../features/auth/authStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    signIn,
    isSubmitting,
    error,
    clearError,
    clearMessages,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    clearError();
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setFormError("Please enter your email and password.");
      return;
    }

    try {
      const result = await signIn({
        email: cleanEmail,
        password,
      });

      if (!result) return;

      if (result.user && result.session) {
        const destination = location.state?.from?.pathname || "/";
        navigate(destination, { replace: true });
      } else {
        setFormError(
          "Sign-in did not return an active session. Please try again."
        );
      }
    } catch (err) {
      setFormError(err.message || "Unable to sign in. Please try again.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#111111] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-12 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-orange-600/10 blur-[120px]" />

      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-orange-500/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-black shadow-lg shadow-orange-500/20">
            A
          </div>

          <span className="text-2xl font-black tracking-tight">
            Anime<span className="text-orange-500">Vault</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e]/95 p-6 shadow-2xl shadow-black/50 sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
              <Lock size={27} className="text-orange-500" />
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to continue your AnimeVault journey.
            </p>
          </div>

          {(formError || error) && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-300"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              <p>{formError || error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFormError("");
                    if (error) clearError();
                  }}
                  className={inputClass}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-300"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-orange-500 transition hover:text-orange-400"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFormError("");
                    if (error) clearError();
                  }}
                  className={inputClass}
                  required
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-4 font-bold text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-600">
              NEW TO ANIMEVAULT?
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-orange-500 transition hover:text-orange-400"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}