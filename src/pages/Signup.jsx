
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Tv,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  User,
} from 'lucide-react'
import { useAuthStore } from '../features/auth/authStore'

export default function Signup() {
  const navigate = useNavigate()

  const { signUp, isSubmitting, error, clearError, clearMessages } =
    useAuthStore()

  const [profileName, setProfileName] = useState('')
  const [favoriteAnime, setFavoriteAnime] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    setFormError('')
    setSuccessMessage('')
    clearError?.()
    clearMessages?.()

    const cleanProfileName = profileName.trim()
    const cleanFavoriteAnime = favoriteAnime.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanProfileName || !cleanFavoriteAnime || !cleanEmail || !password) {
      setFormError('Please complete all fields.')
      return
    }

    if (password.length < 6) {
      setFormError('Your password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Your passwords do not match.')
      return
    }

    try {
      await signUp({
        username: cleanProfileName,
        email: cleanEmail,
        password,
      })

      const authState = useAuthStore.getState()

      if (authState.session || authState.isAuthenticated) {
        navigate('/', { replace: true })
        return
      }

      setSuccessMessage(
        'Your account was created! Please verify your email before signing in.'
      )
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    }
  }

  const handleSkip = () => {
    navigate('/', { replace: true })
  }

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 10
          ? 2
          : 3

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07050d] px-4 py-12 text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-purple-700/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />

      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white"
      >
        Skip <SkipForward size={16} />
      </button>

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#100c1b]/90 p-6 shadow-2xl shadow-purple-950/30 backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-800 shadow-lg shadow-purple-700/30">
            <Tv size={30} />
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            Join <span className="text-purple-400">AnimeVault</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Create your account and enter your anime world.
          </p>
        </div>

        {(formError || error) && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{formError || error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Profile name
            </label>

            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={30}
                autoComplete="nickname"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Favourite anime
            </label>

            <div className="relative">
              <Tv
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type="text"
                value={favoriteAnime}
                onChange={(e) => setFavoriteAnime(e.target.value)}
                placeholder="e.g. Naruto, Demon Slayer..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Email address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {password && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${
                      passwordStrength >= level
                        ? 'bg-purple-500'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Confirm password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter your password again"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3.5 font-bold text-white shadow-lg shadow-purple-900/30 transition hover:from-purple-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={19} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck size={15} className="text-purple-400" />
          Your account is protected.
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-purple-400 transition hover:text-purple-300"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
