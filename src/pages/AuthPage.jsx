
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Film,
  ArrowRight,
  Sparkles,
  Clapperboard,
  Play,
} from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'

export default function AuthPage() {
  const navigate = useNavigate()

  const {
    signUp,
    signIn,
    isSubmitting,
    error,
    clearError,
    clearMessages,
  } = useAuthStore()

  const [mode, setMode] = useState('signup')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')

  const [signupData, setSignupData] = useState({
    profileName: '',
    favoriteAnime: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })

  const isSignup = mode === 'signup'

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-purple-500 focus:bg-purple-500/[0.06] focus:ring-2 focus:ring-purple-500/10'

  const iconClass =
    'absolute left-4 top-1/2 -translate-y-1/2 text-gray-500'

  const clearFormMessages = () => {
    setMessage('')
    clearError?.()
    clearMessages?.()
  }

  const switchMode = (newMode) => {
    if (isSubmitting) return

    setMode(newMode)
    clearFormMessages()
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleSignupChange = (event) => {
    const { name, value } = event.target

    setSignupData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSignup = async (event) => {
    event.preventDefault()

    if (isSubmitting) return

    clearFormMessages()

    const profileName = signupData.profileName.trim()
    const favoriteAnime = signupData.favoriteAnime.trim()
    const email = signupData.email.trim().toLowerCase()
    const password = signupData.password

    if (!profileName || !email || !password) {
      setMessage('Please complete all required fields.')
      return
    }

    if (password.length < 6) {
      setMessage('Your password must contain at least 6 characters.')
      return
    }

    if (password !== signupData.confirmPassword) {
      setMessage('Your passwords do not match.')
      return
    }

    try {
      const result = await signUp({
        username: profileName,
        email,
        password,
        favoriteAnime,
      })

      if (!result?.success) return

      const authState = useAuthStore.getState()

      if (authState.isAuthenticated && authState.session) {
        navigate('/', { replace: true })
        return
      }

      setLoginData({
        email,
        password: '',
      })

      setSignupData((previous) => ({
        ...previous,
        password: '',
        confirmPassword: '',
      }))

      setMessage(
        result.successMessage ||
          'Your account has been created. Please check your email for a confirmation link.'
      )

      setMode('login')
    } catch (err) {
      setMessage(
        err?.message ||
          'Something went wrong while creating your account. Please try again.'
      )
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    if (isSubmitting) return

    clearFormMessages()

    const email = loginData.email.trim().toLowerCase()
    const password = loginData.password

    if (!email || !password) {
      setMessage('Please enter your email and password.')
      return
    }

    try {
      const result = await signIn({
        email,
        password,
      })

      if (!result?.success) return

      const authState = useAuthStore.getState()

      if (!authState.isAuthenticated || !authState.session) {
        setMessage(
          'Login could not be completed. Please try again.'
        )
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setMessage(
        err?.message ||
          'Unable to log in. Please check your credentials and try again.'
      )
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080510] px-4 py-10 text-white">

      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-purple-700/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[140px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-700/10 blur-[130px]" />

      <Link
        to="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-3 sm:left-10 sm:top-8"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 font-black text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
          AV
        </div>

        <span className="text-xs font-black tracking-[3px]">
          ANIME VAULT
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-6xl">

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-[10px] font-bold tracking-[3px] text-purple-300">
            <Sparkles size={13} />
            YOUR ANIME UNIVERSE
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {isSignup ? (
              <>
                YOUR NEXT
                <span className="text-purple-400"> ADVENTURE</span>
                {' '}STARTS HERE
              </>
            ) : (
              <>
                WELCOME
                <span className="text-purple-400"> BACK</span>
              </>
            )}
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            {isSignup
              ? 'Create your account and enter the world of Anime Vault.'
              : 'Your anime universe is waiting for you.'}
          </p>
        </div>

        <div className="grid overflow-hidden rounded-3xl border border-purple-400/20 bg-[#100b1b]/90 shadow-[0_25px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:grid-cols-2">

          <section
            className={
              'relative flex min-h-[620px] items-center justify-center p-6 transition-all duration-700 sm:p-10 ' +
              (isSignup ? 'order-1' : 'order-2')
            }
          >
            <div
              key={mode}
              className="w-full max-w-md animate-[authAppear_0.55s_ease-out]"
            >
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-purple-300">
                  {isSignup ? (
                    <User size={22} />
                  ) : (
                    <Lock size={22} />
                  )}
                </div>

                <h2 className="text-2xl font-black">
                  {isSignup ? 'Create Account' : 'Login'}
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  {isSignup
                    ? 'Join the Anime Vault community.'
                    : 'Continue where your anime journey stopped.'}
                </p>
              </div>

              <form
                onSubmit={isSignup ? handleSignup : handleLogin}
                className="space-y-4"
              >
                {isSignup && (
                  <>
                    <div className="relative">
                      <User size={17} className={iconClass} />

                      <input
                        type="text"
                        name="profileName"
                        value={signupData.profileName}
                        onChange={handleSignupChange}
                        placeholder="Your profile name"
                        autoComplete="username"
                        className={inputClass}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="relative">
                      <Film size={17} className={iconClass} />

                      <input
                        type="text"
                        name="favoriteAnime"
                        value={signupData.favoriteAnime}
                        onChange={handleSignupChange}
                        placeholder="Favourite anime (optional)"
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail size={17} className={iconClass} />

                  <input
                    type="email"
                    name="email"
                    value={
                      isSignup
                        ? signupData.email
                        : loginData.email
                    }
                    onChange={
                      isSignup
                        ? handleSignupChange
                        : handleLoginChange
                    }
                    placeholder="Email address"
                    autoComplete="email"
                    className={inputClass}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="relative">
                  <Lock size={17} className={iconClass} />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={
                      isSignup
                        ? signupData.password
                        : loginData.password
                    }
                    onChange={
                      isSignup
                        ? handleSignupChange
                        : handleLoginChange
                    }
                    placeholder="Password"
                    autoComplete={
                      isSignup ? 'new-password' : 'current-password'
                    }
                    className={`${inputClass} pr-12`}
                    required
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={isSubmitting}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-purple-300"
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

                {isSignup && (
                  <div className="relative">
                    <Lock size={17} className={iconClass} />

                    <input
                      type={
                        showConfirmPassword ? 'text' : 'password'
                      }
                      name="confirmPassword"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className={`${inputClass} pr-12`}
                      required
                      disabled={isSubmitting}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      disabled={isSubmitting}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-purple-300"
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                )}

                {(message || error) && (
                  <div
                    role="alert"
                    className={`rounded-xl border px-4 py-3 text-xs leading-5 ${
                      error
                        ? 'border-red-500/20 bg-red-500/10 text-red-300'
                        : 'border-purple-400/20 bg-purple-500/10 text-purple-200'
                    }`}
                  >
                    {error || message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-700 to-violet-600 py-4 text-xs font-black tracking-[2px] shadow-[0_0_25px_rgba(147,51,234,0.2)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(147,51,234,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'PLEASE WAIT...'
                    : isSignup
                      ? 'CREATE ACCOUNT'
                      : 'LOGIN TO YOUR ACCOUNT'}

                  {!isSubmitting && (
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              <div className="mt-7 text-center text-sm text-gray-400">
                {isSignup
                  ? 'Already have an account?'
                  : "Don't have an account?"}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    switchMode(isSignup ? 'login' : 'signup')
                  }
                  className="ml-2 font-bold text-purple-300 transition hover:text-purple-200 disabled:opacity-50"
                >
                  {isSignup ? 'Login' : 'Create account'}
                </button>
              </div>

              <p className="mt-8 text-center text-[10px] tracking-wider text-gray-600">
                DISCOVER · EXPLORE · EXPERIENCE
              </p>
            </div>
          </section>

          <section
            className={
              'relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#241044] via-[#32135c] to-[#160b29] p-8 text-center transition-all duration-700 md:min-h-[620px] ' +
              (isSignup ? 'order-2' : 'order-1')
            }
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(192,132,252,0.22),transparent_55%)]" />

            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-purple-300/10" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-purple-300/10" />

            <div
              key={`welcome-${mode}`}
              className="relative z-10 max-w-sm animate-[authAppear_0.65s_ease-out]"
            >
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-purple-300/20 bg-white/[0.07] shadow-[0_0_50px_rgba(168,85,247,0.2)] backdrop-blur-xl">
                {isSignup ? (
                  <Clapperboard
                    size={42}
                    className="text-purple-200"
                  />
                ) : (
                  <Play
                    size={42}
                    className="ml-1 text-purple-200"
                  />
                )}
              </div>

              <p className="text-[10px] font-bold tracking-[5px] text-purple-200">
                {isSignup ? 'WELCOME TO' : 'GOOD TO SEE YOU'}
              </p>

              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {isSignup ? (
                  <>
                    ANIME
                    <span className="text-purple-300"> VAULT</span>
                  </>
                ) : (
                  <>
                    YOUR WORLD.
                    <br />
                    <span className="text-purple-300">
                      YOUR STORIES.
                    </span>
                  </>
                )}
              </h2>

              <p className="mx-auto mt-5 max-w-xs text-sm leading-7 text-purple-100/70">
                {isSignup
                  ? 'Create your account and discover a universe filled with anime, stories, and new experiences.'
                  : 'Sign in and return to your favourite anime, saved collections, and community.'}
              </p>

              <div className="mt-9">
                <p className="mb-4 text-xs text-purple-200/70">
                  {isSignup
                    ? 'Already part of the community?'
                    : 'New to Anime Vault?'}
                </p>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    switchMode(isSignup ? 'login' : 'signup')
                  }
                  className="rounded-full border border-purple-200/40 bg-white/[0.06] px-9 py-3.5 text-xs font-black tracking-[2px] backdrop-blur-md transition duration-300 hover:border-purple-200 hover:bg-white/[0.13] hover:shadow-[0_0_30px_rgba(192,132,252,0.2)] disabled:opacity-50"
                >
                  {isSignup ? 'LOGIN' : 'CREATE ACCOUNT'}
                </button>
              </div>
            </div>

            <div className="absolute bottom-7 left-0 right-0 text-center text-[9px] font-bold tracking-[4px] text-purple-200/40">
              DISCOVER YOUR NEXT WORLD
            </div>
          </section>

        </div>

        <p className="mt-6 text-center text-[10px] text-gray-600">
          © {new Date().getFullYear()} ANIME VAULT. ALL RIGHTS RESERVED.
        </p>

      </div>

      <style>
        {`
          @keyframes authAppear {
            from {
              opacity: 0;
              transform: translateY(18px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </main>
  )
}
