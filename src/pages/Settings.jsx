
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiSettings,
  FiUser,
  FiLock,
  FiDroplet,
  FiPlay,
  FiBell,
  FiShield,
  FiLogOut,
  FiSave,
  FiEye,
  FiEyeOff,
  FiChevronRight,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiMonitor,
  FiArrowRight,
  FiCamera,
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'

const PREFERENCES_KEY = 'anime-vault-settings'

const sections = [
  { id: 'account', label: 'Account', icon: FiUser },
  { id: 'security', label: 'Security', icon: FiLock },
  { id: 'appearance', label: 'Appearance', icon: FiDroplet },
  { id: 'playback', label: 'Playback', icon: FiPlay },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
]

function getSavedPreferences() {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function getDisplayName(profile, user) {
  return (
    profile?.displayName ||
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'AnimeVault User'
  )
}

function getAvatarUrl(profile, user) {
  return (
    profile?.avatarUrl ||
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
        checked ? 'bg-orange-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.07] py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-semibold text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-2 flex items-start gap-3">
      <div className="rounded-xl border border-orange-500/15 bg-orange-500/10 p-2.5 text-orange-400">
        <Icon className="text-xl" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const signOutStore = useAuthStore((state) => state.signOut)

  const [activeSection, setActiveSection] = useState('account')

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [preferences, setPreferences] = useState(getSavedPreferences)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [message, setMessage] = useState(null)

  const darkMode = preferences.darkMode ?? true
  const autoplay = preferences.autoplay ?? true
  const reducedMotion = preferences.reducedMotion ?? false
  const emailNotifications = preferences.emailNotifications ?? true
  const productUpdates = preferences.productUpdates ?? false

  const profilePath = user?.id ? `/profile/${user.id}` : '/login'
  const avatarUrl = getAvatarUrl(profile, user)
  const accountName = getDisplayName(profile, user)
  const avatarLetter = accountName.charAt(0).toUpperCase()

  const updatePreference = (key, value) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }))
  }

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false)
      setEmail('')
      setUsername('')
      setDisplayName('')
      return
    }

    let active = true

    async function loadSettings() {
      setLoadingProfile(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error
        if (!active) return

        setUsername(
          data?.username ||
            user.user_metadata?.username ||
            '',
        )

        setDisplayName(
          data?.display_name ||
            user.user_metadata?.display_name ||
            user.user_metadata?.username ||
            '',
        )

        setEmail(user.email || '')
      } catch (error) {
        if (active) {
          setMessage({
            type: 'error',
            text: error.message || 'Could not load your account settings.',
          })
        }
      } finally {
        if (active) setLoadingProfile(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify(preferences),
      )
    } catch {
      // Preferences remain available during this session.
    }
  }, [preferences])

  const saveProfile = async (event) => {
    event.preventDefault()
    setMessage(null)

    if (!user) {
      setMessage({
        type: 'error',
        text: 'Please sign in first.',
      })
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    const cleanDisplayName = displayName.trim()

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setMessage({
        type: 'error',
        text: 'Username must be 3–20 characters using letters, numbers, or underscores.',
      })
      return
    }

    if (!cleanDisplayName) {
      setMessage({
        type: 'error',
        text: 'Display name cannot be empty.',
      })
      return
    }

    setSavingProfile(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            username: cleanUsername,
            display_name: cleanDisplayName,
          },
          { onConflict: 'id' },
        )

      if (error) throw error

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
        },
      })

      if (metadataError) throw metadataError

      setUsername(cleanUsername)
      setDisplayName(cleanDisplayName)

      setMessage({
        type: 'success',
        text: 'Your account details have been saved.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Could not save your account details.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage(null)

    if (!user?.email) {
      setMessage({
        type: 'error',
        text: 'Please sign in with an email account first.',
      })
      return
    }

    if (!currentPassword) {
      setMessage({
        type: 'error',
        text: 'Enter your current password.',
      })
      return
    }

    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Your new password must be at least 8 characters.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'The new passwords do not match.',
      })
      return
    }

    setChangingPassword(true)

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        throw new Error('Your current password is incorrect.')
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setMessage({
        type: 'success',
        text: 'Your password has been updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Could not update your password.',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const signOut = async () => {
    if (!user || signingOut) return

    setSigningOut(true)
    setMessage(null)

    try {
      if (signOutStore) {
        const result = await signOutStore()

        if (result === false) {
          throw new Error('Could not sign out. Please try again.')
        }
      } else {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }

      navigate('/login', { replace: true })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Could not sign out. Please try again.',
      })
    } finally {
      setSigningOut(false)
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/10'

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
          <FiSettings />
          <span>AnimeVault</span>
          <FiChevronRight className="text-xs" />
          <span className="font-semibold text-orange-400">Settings</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Settings<span className="text-orange-500">.</span>
        </h1>

        <p className="mt-2 text-gray-500">
          Customize your AnimeVault experience.
        </p>
      </div>

      {user && (
        <Link
          to={profilePath}
          className="group mb-6 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-4 transition hover:border-orange-500/30 hover:bg-orange-500/[0.04] sm:p-5"
        >
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile"
                className="h-14 w-14 rounded-full border-2 border-orange-500/40 object-cover transition group-hover:border-orange-400"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-orange-500/40 bg-orange-500/10 text-xl font-black text-orange-400">
                {avatarLetter}
              </div>
            )}

            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0c0c0c] bg-orange-500 text-black">
              <FiCamera className="text-[10px]" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white transition group-hover:text-orange-400">
              {accountName}
            </p>
            <p className="truncate text-xs text-gray-500">
              {user.email}
            </p>
            <p className="mt-1 text-xs font-semibold text-orange-400">
              View your profile
            </p>
          </div>

          <FiArrowRight className="shrink-0 text-lg text-gray-600 transition group-hover:translate-x-1 group-hover:text-orange-400" />
        </Link>
      )}

      {message && (
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <FiCheckCircle className="mt-0.5 shrink-0 text-lg" />
          ) : (
            <FiAlertCircle className="mt-0.5 shrink-0 text-lg" />
          )}

          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-3">
          <p className="px-3 pb-3 pt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600">
            Preferences
          </p>

          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id)
                  setMessage(null)
                }}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all lg:w-full ${
                  activeSection === id
                    ? 'border border-orange-500/15 bg-orange-500/10 text-orange-400'
                    : 'border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className="shrink-0 text-lg" />
                {label}
              </button>
            ))}
          </nav>

          <div className="my-3 hidden border-t border-white/[0.07] lg:block" />

          <Link
            to={profilePath}
            className="hidden items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-500 transition hover:bg-orange-500/10 hover:text-orange-400 lg:flex"
          >
            <FiUser className="text-lg" />
            View profile
            <FiArrowRight className="ml-auto text-xs" />
          </Link>

          <div className="mt-4 hidden rounded-xl border border-white/[0.06] bg-[#101010] p-4 lg:block">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <FiShield className="text-lg text-orange-400" />
              Your account
            </div>

            <p className="break-all text-xs leading-5 text-gray-500">
              {user?.email || 'You are not signed in.'}
            </p>

            {user && (
              <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Account connected
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5 sm:p-7">
          {activeSection === 'account' && (
            <section>
              <SectionHeading
                icon={FiUser}
                title="Account details"
                description="Manage the information connected to your profile."
              />

              {!user ? (
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-gray-400">
                    Sign in to update your account details.
                  </p>

                  <Link
                    to="/login"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                  >
                    Sign in <FiArrowRight />
                  </Link>
                </div>
              ) : loadingProfile ? (
                <div className="flex items-center gap-3 py-12 text-sm text-gray-500">
                  <FiLoader className="animate-spin text-xl text-orange-400" />
                  Loading account details...
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-6 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-white">
                      Email address
                    </label>

                    <input
                      value={email}
                      readOnly
                      className={`${inputClass} cursor-not-allowed opacity-60`}
                    />

                    <p className="mt-2 text-xs text-gray-600">
                      Email changes are not available on this settings page.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="settings-username"
                      className="text-sm font-semibold text-white"
                    >
                      Username
                    </label>

                    <input
                      id="settings-username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      maxLength={20}
                      autoComplete="username"
                      className={inputClass}
                      placeholder="your_username"
                      required
                    />

                    <p className="mt-2 text-xs text-gray-600">
                      3–20 characters: letters, numbers, and underscores.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="settings-display-name"
                      className="text-sm font-semibold text-white"
                    >
                      Display name
                    </label>

                    <input
                      id="settings-display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={50}
                      className={inputClass}
                      placeholder="Your display name"
                      required
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <FiLoader className="animate-spin text-lg" />
                      ) : (
                        <FiSave className="text-lg" />
                      )}

                      {savingProfile ? 'Saving...' : 'Save changes'}
                    </button>

                    <Link
                      to={profilePath}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-orange-400"
                    >
                      View profile
                    </Link>
                  </div>
                </form>
              )}
            </section>
          )}

          {activeSection === 'security' && (
            <section>
              <SectionHeading
                icon={FiLock}
                title="Security"
                description="Manage your account security."
              />

              {!user ? (
                <p className="py-8 text-sm text-gray-500">
                  Sign in to manage your account security.
                </p>
              ) : (
                <form onSubmit={changePassword} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="current-password"
                      className="text-sm font-semibold text-white"
                    >
                      Current password
                    </label>

                    <input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-password"
                      className="text-sm font-semibold text-white"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className={`${inputClass} pr-12`}
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-gray-500 transition hover:text-orange-400"
                      >
                        {showPassword ? (
                          <FiEyeOff className="text-lg" />
                        ) : (
                          <FiEye className="text-lg" />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-600">
                      Use at least 8 characters.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="text-sm font-semibold text-white"
                    >
                      Confirm new password
                    </label>

                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={inputClass}
                      minLength={8}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
                  >
                    {changingPassword ? (
                      <FiLoader className="animate-spin text-lg" />
                    ) : (
                      <FiLock className="text-lg" />
                    )}

                    {changingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              )}

              <div className="mt-8 border-t border-white/[0.07] pt-6">
                <h3 className="font-bold text-white">Sign out</h3>

                <p className="mt-1 text-sm text-gray-500">
                  Sign out of AnimeVault on this device.
                </p>

                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut || !user}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {signingOut ? (
                    <FiLoader className="animate-spin text-lg" />
                  ) : (
                    <FiLogOut className="text-lg" />
                  )}

                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section>
              <SectionHeading
                icon={FiDroplet}
                title="Appearance"
                description="Customize how AnimeVault looks on this device."
              />

              <SettingRow
                title="Dark appearance"
                description="Keep the dark interface preference enabled."
              >
                <Toggle
                  checked={darkMode}
                  onChange={(value) => updatePreference('darkMode', value)}
                  label="Dark appearance"
                />
              </SettingRow>

              <SettingRow
                title="Reduce motion"
                description="Preference for fewer animations in components that support it."
              >
                <Toggle
                  checked={reducedMotion}
                  onChange={(value) => updatePreference('reducedMotion', value)}
                  label="Reduce motion"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-orange-500/10 bg-orange-500/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <FiMonitor className="text-xl text-orange-400" />

                  <div>
                    <p className="text-sm font-bold text-white">
                      Current theme preference
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {darkMode
                        ? 'Dark appearance is enabled.'
                        : 'Light appearance is selected, but the app currently uses its dark styling.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'playback' && (
            <section>
              <SectionHeading
                icon={FiPlay}
                title="Playback"
                description="Choose how supported video players should behave."
              />

              <SettingRow
                title="Autoplay videos"
                description="Preference for automatically starting supported videos."
              >
                <Toggle
                  checked={autoplay}
                  onChange={(value) => updatePreference('autoplay', value)}
                  label="Autoplay videos"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#101010] p-4">
                <div className="flex items-start gap-3">
                  <FiPlay className="mt-0.5 text-lg text-orange-400" />

                  <p className="text-sm leading-6 text-gray-500">
                    This preference is saved in your browser. Your video
                    player must read this setting before autoplay behavior
                    changes.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section>
              <SectionHeading
                icon={FiBell}
                title="Notifications"
                description="Manage the updates you want to receive."
              />

              <SettingRow
                title="Email notifications"
                description="Your preference for account and activity emails."
              >
                <Toggle
                  checked={emailNotifications}
                  onChange={(value) =>
                    updatePreference('emailNotifications', value)
                  }
                  label="Email notifications"
                />
              </SettingRow>

              <SettingRow
                title="Product updates"
                description="Your preference for announcements about new AnimeVault features."
              >
                <Toggle
                  checked={productUpdates}
                  onChange={(value) =>
                    updatePreference('productUpdates', value)
                  }
                  label="Product updates"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#101010] p-4">
                <div className="flex items-start gap-3">
                  <FiBell className="mt-0.5 text-lg text-orange-400" />

                  <p className="text-sm leading-6 text-gray-500">
                    These switches currently save preferences in this
                    browser. Actual notification emails require a notification
                    service to be connected.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#0c0c0c] p-4">
        <FiShield className="mt-0.5 shrink-0 text-xl text-orange-400" />

        <p className="text-xs leading-6 text-gray-500">
          Account changes are stored in Supabase. Appearance, playback,
          and notification preferences are stored locally in this browser.
        </p>
      </div>
    </div>
  )
}
