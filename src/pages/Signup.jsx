import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../features/auth/authStore";

export default function Signup() {
  const navigate = useNavigate();

  const {
    signUp,
    isSubmitting,
    error,
    clearError,
    clearMessages,
  } = useAuthStore();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [formError, setFormError] = useState("");
  const [confirmationMessage, setConfirmationMessage] =
    useState("");

  const passwordStrength = (() => {
    const password = form.password;
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) return { score: 0, label: "" };
    if (score <= 2) return { score, label: "Weak" };
    if (score <= 4) return { score, label: "Medium" };

    return { score, label: "Strong" };
  })();

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError("");
    setConfirmationMessage("");

    if (error) clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setConfirmationMessage("");
    clearError();
    clearMessages();

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      setFormError("Please complete every field.");
      return;
    }

    if (username.length < 3) {
      setFormError(
        "Your username must contain at least 3 characters."
      );
      return;
    }

    if (username.length > 24) {
      setFormError(
        "Your username cannot exceed 24 characters."
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setFormError(
        "Use only letters, numbers, and underscores in your username."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setFormError(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Your passwords do not match.");
      return;
    }

    try {
      const result = await signUp({
        username,
        email,
        password,
      });

      if (!result) {
        return;
      }

      if (result.session && result.user) {
        navigate("/", { replace: true });
        return;
      }

      if (result.needsEmailConfirmation) {
        setConfirmationMessage(
          result.successMessage ||
            "Your account has been created. Please check your email to confirm your account before signing in."
        );
        return;
      }

      setFormError(
        "We couldn't confirm your sign-in session. Please try signing in or check your Supabase authentication settings."
      );
    } catch (err) {
      setFormError(
        err.message || "Unable to create your account. Please try again."
      );
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
              <ShieldCheck
                size={27}
                className="text-orange-500"
              />
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              Join AnimeVault
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Create your account and enter your anime world.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-300"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <p>{formError}</p>
            </div>
          )}

          {!formError && error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-300"
            >
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <p>{error}</p>
            </div>
          )}

          {confirmationMessage ? (
            <div
              role="status"
              className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-center"
            >
              <CheckCircle2
                size={42}
                className="mx-auto mb-3 text-green-400"
              />

              <h2 className="text-lg font-bold text-green-300">
                Account created!
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-300">
                {confirmationMessage}
              </p>

              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-bold text-black transition hover:bg-orange-400"
              >
                Go to Sign In
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Username
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                  />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={handleChange}
                    className={inputClass}
                    minLength={3}
                    maxLength={24}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

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
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                    className={inputClass}
                    minLength={6}
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
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {form.password && (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Password strength
                      </span>

                      <span
                        className={
                          passwordStrength.label === "Strong"
                            ? "text-green-400"
                            : passwordStrength.label === "Medium"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            level <= passwordStrength.score
                              ? passwordStrength.score <= 2
                                ? "bg-red-500"
                                : passwordStrength.score <= 4
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    {showConfirmPassword ? (
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
                    <LoaderCircle
                      size={19}
                      className="animate-spin"
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-xs text-gray-600">
              ALREADY A MEMBER?
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-orange-500 transition hover:text-orange-400"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-600">
          By creating an account, you agree to use AnimeVault
          responsibly and respect other members of the community.
        </p>
      </div>
    </main>
  );
}