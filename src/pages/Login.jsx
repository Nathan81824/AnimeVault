
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  SkipForward,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    signIn,
    isSubmitting,
    error,
    clearError,
    clearMessages,
  } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSkip = () => {
    navigate('/', { replace: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setFormError('')
    clearError()
    clearMessages()

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    try {
      const result = await signIn({
        email: cleanEmail,
        password,
      })

      if (!result) return

      if (result.user && result.session) {
        const destination = location.state?.from?.pathname || '/'
        navigate(destination, { replace: true })
      } else {
        setFormError(
          'Sign-in did not return an active session. Please try again.'
        )
      }
    } catch (err) {
      setFormError(
        err.message || 'Unable to sign in. Please try again.'
      )
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#100d19] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07050d] px-4 py-12 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-purple-700/20 blur-[120px]" />

      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-fuchsia-700/20 blur-[120px]" />

      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-200 transition hover:border-purple-400/60 hover:bg-purple-500/20"
      >
        Skip
        <SkipForward size={16} />
      </button>

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-600 text-xl font-black text-white shadow-lg shadow-purple-500/30">
            AV
          </div>

          <span className="text-2xl font-black tracking-tight">
            Anime<span className="text-purple-400">Vault</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-purple-400/20 bg-[#100b1d]/95 p-6 shadow-2xl shadow-purple-950/30 backdrop-blur-xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10">
              <ShieldCheck size={27} className="text-purple-400" />
            </div>

            <p className="text-[10px] font-bold tracking-[4px] text-purple-300">
              WELCOME BACK
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              Enter Your Vault
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to continue your Anime Vault journey.
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
                    setEmail(event.target.value)
                    setFormError('')
                    if (error) clearError()
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
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setFormError('')
                    if (error) clearError()
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-purple-300"
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-purple-500 px-5 py-4 font-bold text-white shadow-lg shadow-purple-900/30 transition hover:-translate-y-0.5 hover:from-purple-600 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
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
              NEW TO ANIME VAULT?
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-purple-400 transition hover:text-purple-300"
            >
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs tracking-wide text-purple-300/40">
          DISCOVER • EXPLORE • EXPERIENCE
        </p>
      </div>
    </main>
  )
}
