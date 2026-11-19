
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Film,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
  CheckCircle2,
  LogIn,
  UserPlus,
  GitBranch,
  Globe,
} from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'

export default function AuthPage() {
  const navigate = useNavigate()

  const {
    signUp,
    signIn,
    signInWithProvider,
    isSubmitting,
    isAuthenticated,
    error,
    successMessage,
    clearError,
    clearMessages,
  } = useAuthStore()

  const [mode, setMode] = useState('signup')
  const [profileName, setProfileName] = useState('')
  const [favoriteAnime, setFavoriteAnime] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [activeProvider, setActiveProvider] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    setFormMessage('')
    clearError?.()
    clearMessages?.()
  }, [mode, clearError, clearMessages])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setFormMessage('')
    setMessageType('error')
    clearError?.()
    clearMessages?.()
  }

  const handleProviderSignIn = async (provider) => {
    if (isSubmitting || activeProvider) return

    setFormMessage('')
    setMessageType('error')
    setActiveProvider(provider)

    clearError?.()
    clearMessages?.()

    try {
      const result = await signInWithProvider(provider)

      if (!result?.success) {
        setFormMessage(
          result?.error ||
            error ||
            `Could not continue with ${provider}. Please try again.`
        )
        setActiveProvider('')
      }
    } catch (err) {
      setFormMessage(
        err?.message ||
          `Could not continue with ${provider}. Please try again.`
      )
      setActiveProvider('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setFormMessage('')
    setMessageType('error')
    clearError?.()
    clearMessages?.()

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setFormMessage('Please enter your email and password.')
      return
    }

    if (mode === 'signup') {
      if (!profileName.trim()) {
        setFormMessage('Please enter your display name.')
        return
      }

      if (password.length < 6) {
        setFormMessage(
          'Your password must contain at least 6 characters.'
        )
        return
      }

      if (password !== confirmPassword) {
        setFormMessage('Your passwords do not match.')
        return
      }

      try {
        const result = await signUp({
          username: profileName.trim(),
          email: cleanEmail,
          password,
          favoriteAnime: favoriteAnime.trim(),
        })

        if (result?.success) {
          setMessageType('success')
          setFormMessage(
            result.successMessage ||
              result.message ||
              'Your account has been created successfully.'
          )

          if (result.session || isAuthenticated) {
            navigate('/', { replace: true })
          } else {
            setMode('login')
            setPassword('')
            setConfirmPassword('')
          }

          return
        }

        const signupError =
          result?.error ||
          error ||
          'We could not create your account. Please try again.'

        const normalizedError = String(signupError).toLowerCase()

        const duplicateEmail =
          normalizedError.includes('already registered') ||
          normalizedError.includes('already exists') ||
          normalizedError.includes('already been registered') ||
          normalizedError.includes('user already') ||
          normalizedError.includes('email address is already') ||
          normalizedError.includes('may already be registered')

        if (duplicateEmail) {
          setFormMessage(
            'You already have an account with this email. Please log in instead.'
          )
          return
        }

        setFormMessage(signupError)
      } catch (err) {
        const message = err?.message || 'Something went wrong.'
        const normalizedError = message.toLowerCase()

        if (
          normalizedError.includes('already registered') ||
          normalizedError.includes('already exists') ||
          normalizedError.includes('user already')
        ) {
          setFormMessage(
            'You already have an account with this email. Please log in instead.'
          )
        } else {
          setFormMessage(message)
        }
      }

      return
    }

    try {
      const result = await signIn({
        email: cleanEmail,
        password,
      })

      if (result?.success) {
        navigate('/', { replace: true })
        return
      }

      setFormMessage(
        result?.error ||
          error ||
          'Login failed. Please check your email and password.'
      )
    } catch (err) {
      setFormMessage(
        err?.message || 'Unable to log in. Please try again.'
      )
    }
  }

  const displayMessage = formMessage || error || successMessage
  const isSuccess = messageType === 'success' && Boolean(formMessage)

  return (
    <main className="relative flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#090909] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-orange-500/[0.10] blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-orange-600/[0.08] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#090909_75%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:55px_55px]" />
      </div>

      <div className="absolute right-4 top-4 z-30 sm:right-7 sm:top-6">
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-gray-300 backdrop-blur-xl transition-all duration-300 hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-orange-300"
        >
          Skip for now
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 w-full flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center px-4 py-20 sm:px-8 sm:py-12">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#101010]/90 shadow-[0_25px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:grid-cols-2">

            <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[#11100e] p-10 md:flex lg:p-12">
              <div className="pointer-events-none absolute -right-28 top-20 h-72 w-72 animate-[slowFloat_9s_ease-in-out_infinite] rounded-full border border-orange-500/10" />
              <div className="pointer-events-none absolute -right-16 top-32 h-48 w-48 animate-[slowFloat_7s_ease-in-out_infinite] rounded-full border border-orange-500/10" />
              <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-orange-500/[0.08] blur-[90px]" />

              <Link to="/" className="relative z-10 flex w-fit items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20">
                  <Film size={23} className="text-black" />
                </div>
                <span className="text-xl font-black tracking-tight">
                  Anime<span className="text-orange-400">Vault</span>
                </span>
              </Link>

              <div className="relative z-10 my-10">
                <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-400">
                  <Sparkles size={32} />
                </div>

                <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-orange-400">
                  Your anime universe
                </p>

                <h1 className="max-w-md text-4xl font-black leading-[1.15] lg:text-5xl">
                  Every story has a place.
                  <span className="mt-2 block text-orange-400">
                    Find yours.
                  </span>
                </h1>

                <p className="mt-6 max-w-sm text-sm leading-7 text-gray-400">
                  Discover anime, explore new worlds, watch Shorts and build
                  your own personal anime collection.
                </p>

                <div className="mt-9 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="h-8 w-8 rounded-full border-2 border-[#11100e] bg-orange-400" />
                    <span className="h-8 w-8 rounded-full border-2 border-[#11100e] bg-orange-600" />
                    <span className="h-8 w-8 rounded-full border-2 border-[#11100e] bg-amber-300" />
                  </div>
                  <span className="text-xs text-gray-400">
                    Your next favourite anime awaits.
                  </span>
                </div>
              </div>

              <p className="relative z-10 text-xs text-gray-600">
                Made for anime fans, by anime fans.
              </p>
            </section>

            <section className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-12">
              <div className="mb-7 flex items-center gap-3 md:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
                  <Film size={21} className="text-black" />
                </div>
                <span className="text-lg font-black">
                  Anime<span className="text-orange-400">Vault</span>
                </span>
              </div>

              <div
                key={mode}
                className="animate-[authAppear_500ms_ease-out_both]"
              >
                <div className="mb-7">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400">
                    {mode === 'signup' ? (
                      <>
                        <UserPlus size={14} />
                        JOIN ANIMEVAULT
                      </>
                    ) : (
                      <>
                        <LogIn size={14} />
                        WELCOME BACK
                      </>
                    )}
                  </div>

                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {mode === 'signup' ? 'Create account' : 'Welcome back'}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {mode === 'signup'
                      ? 'Create your account and enter your anime universe.'
                      : 'Log in to continue your AnimeVault journey.'}
                  </p>
                </div>

                <div className="mb-6 rounded-2xl border border-orange-400/15 bg-orange-500/[0.07] p-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-orange-400">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-300">
                        {mode === 'signup'
                          ? 'New to AnimeVault?'
                          : 'Already have an account?'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        {mode === 'signup'
                          ? 'Create an account below, or use Google or GitHub to continue.'
                          : 'Use the same email and password you registered with, or continue using a connected provider.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleProviderSignIn('google')}
                    disabled={isSubmitting || Boolean(activeProvider)}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-bold text-gray-200 transition-all duration-300 hover:border-orange-400/40 hover:bg-orange-500/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeProvider === 'google' ? (
                      <LoaderCircle size={19} className="animate-spin" />
                    ) : (
                      <Globe size={19} className="text-orange-400" />
                    )}
                    {activeProvider === 'google'
                      ? 'Connecting to Google...'
                      : 'Continue with Google'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderSignIn('github')}
                    disabled={isSubmitting || Boolean(activeProvider)}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-bold text-gray-200 transition-all duration-300 hover:border-orange-400/40 hover:bg-orange-500/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeProvider === 'github' ? (
                      <LoaderCircle size={19} className="animate-spin" />
                    ) : (
                      <GitBranch size={19} className="text-orange-400" />
                    )}
                    {activeProvider === 'github'
                      ? 'Connecting to GitHub...'
                      : 'Continue with GitHub'}
                  </button>
                </div>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                    Or continue with email
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                          Display name
                        </label>
                        <div className="relative">
                          <UserRound
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                          <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="What should we call you?"
                            autoComplete="nickname"
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-orange-500/[0.04] focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                          Favourite anime
                          <span className="ml-2 font-normal text-gray-600">
                            Optional
                          </span>
                        </label>
                        <div className="relative">
                          <Film
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                          <input
                            type="text"
                            value={favoriteAnime}
                            onChange={(e) => setFavoriteAnime(e.target.value)}
                            placeholder="e.g. Naruto"
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-orange-500/[0.04] focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-300">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-orange-500/[0.04] focus:ring-2 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete={
                          mode === 'signup'
                            ? 'new-password'
                            : 'current-password'
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-orange-500/[0.04] focus:ring-2 focus:ring-orange-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-orange-400"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-300">
                        Confirm password
                      </label>
                      <div className="relative">
                        <LockKeyhole
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Enter your password again"
                          autoComplete="new-password"
                          required
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-orange-500/[0.04] focus:ring-2 focus:ring-orange-500/10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-orange-400"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {displayMessage && (
                    <div
                      className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${
                        isSuccess
                          ? 'border-green-500/20 bg-green-500/[0.08] text-green-300'
                          : 'border-red-500/20 bg-red-500/[0.08] text-red-300'
                      }`}
                    >
                      {isSuccess && (
                        <CheckCircle2
                          size={16}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {displayMessage}

                        {!isSuccess &&
                          mode === 'signup' &&
                          displayMessage.toLowerCase().includes('already') && (
                            <button
                              type="button"
                              onClick={() => switchMode('login')}
                              className="mt-2 block font-bold text-orange-300 underline underline-offset-4 transition-colors hover:text-orange-200"
                            >
                              Go to login <ArrowRight className="ml-1 inline" size={13} />
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(activeProvider)}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 text-sm font-black text-black shadow-lg shadow-orange-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      <>
                        {mode === 'signup'
                          ? 'Create my account'
                          : 'Log in'}
                        <ArrowRight
                          size={17}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 text-center">
                  <p className="text-sm text-gray-500">
                    {mode === 'signup'
                      ? 'Already have an account?'
                      : 'New to AnimeVault?'}
                    <button
                      type="button"
                      onClick={() =>
                        switchMode(mode === 'signup' ? 'login' : 'signup')
                      }
                      className="ml-2 font-bold text-orange-400 transition-colors duration-300 hover:text-orange-300"
                    >
                      {mode === 'signup' ? 'Log in' : 'Create account'}
                    </button>
                  </p>
                </div>

                <p className="mt-8 text-center text-[10px] leading-5 text-gray-600">
                  By continuing, you agree to use AnimeVault respectfully and
                  keep your account details secure.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes authAppear {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slowFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-18px) rotate(8deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  )
}
