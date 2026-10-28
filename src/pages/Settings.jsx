import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  User,
  LockKeyhole,
  Palette,
  Play,
  Bell,
  ShieldCheck,
  LogOut,
  Save,
  Eye,
  EyeOff,
  ChevronRight,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Monitor,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: LockKeyhole },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'playback', label: 'Playback', icon: Play },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-vault-purple' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
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
        <h3 className="font-medium text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm leading-6 text-vault-muted">
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
      <div className="rounded-xl bg-vault-purple/15 p-2.5 text-vault-accent">
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-vault-muted">{description}</p>
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [activeSection, setActiveSection] = useState('account')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [darkMode, setDarkMode] = useState(true)
  const [autoplay, setAutoplay] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [productUpdates, setProductUpdates] = useState(false)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false)
      return
    }

    let active = true

    async function loadSettings() {
      setLoadingProfile(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        if (!active) return

        setUsername(data?.username || user.user_metadata?.username || '')
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
      const saved = localStorage.getItem('anime-vault-settings')

      if (saved) {
        const settings = JSON.parse(saved)
        setDarkMode(settings.darkMode ?? true)
        setAutoplay(settings.autoplay ?? true)
        setReducedMotion(settings.reducedMotion ?? false)
        setEmailNotifications(settings.emailNotifications ?? true)
        setProductUpdates(settings.productUpdates ?? false)
      }
    } catch {
      // Keep the default settings if local storage is unavailable.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'anime-vault-settings',
        JSON.stringify({
          darkMode,
          autoplay,
          reducedMotion,
          emailNotifications,
          productUpdates,
        }),
      )
    } catch {
      // Settings remain usable for this session if storage is unavailable.
    }
  }, [
    darkMode,
    autoplay,
    reducedMotion,
    emailNotifications,
    productUpdates,
  ])

  const saveProfile = async (event) => {
    event.preventDefault()
    setMessage(null)

    if (!user || !supabase) {
      setMessage({ type: 'error', text: 'Please sign in first.' })
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

    if (!supabase || !user?.email) {
      setMessage({
        type: 'error',
        text: 'Please sign in with an email account first.',
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

      if (verifyError) throw new Error('Your current password is incorrect.')

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
    if (!supabase) return

    setSigningOut(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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
    'mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-vault-muted focus:border-vault-purple'

  const activeTab = (id) => setActiveSection(id)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-vault-muted">
          <SettingsIcon size={16} />
          <span>Anime Vault</span>
          <ChevronRight size={14} />
          <span className="text-vault-accent">Settings</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-vault-muted">
          Make Anime Vault feel right for you.
        </p>
      </div>

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
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/[0.07] bg-vault-surface p-3">
          <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-vault-muted">
            Preferences
          </p>

          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => activeTab(id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm transition lg:w-full ${
                  activeSection === id
                    ? 'bg-vault-purple/15 font-medium text-vault-accent'
                    : 'text-vault-muted hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}

            <div className="my-2 hidden border-t border-white/[0.07] lg:block" />

            <Link
              to="/profile"
              className="hidden items-center gap-3 rounded-xl px-3 py-3 text-sm text-vault-muted transition hover:bg-white/[0.04] hover:text-white lg:flex"
            >
              <User size={18} />
              View profile
            </Link>
          </nav>

          <div className="mt-4 hidden rounded-xl bg-[#0d0d16] p-4 lg:block">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck size={17} className="text-vault-accent" />
              Your account
            </div>
            <p className="break-all text-xs leading-5 text-vault-muted">
              {user?.email || 'You are not signed in.'}
            </p>
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-vault-surface p-5 sm:p-7">
          {activeSection === 'account' && (
            <section>
              <SectionHeading
                icon={User}
                title="Account details"
                description="Manage the information connected to your profile."
              />

              {!user ? (
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm text-vault-muted">
                    Sign in to update your account details.
                  </p>
                  <Link
                    to="/login"
                    className="mt-4 inline-flex rounded-xl bg-vault-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vault-purple/80"
                  >
                    Sign in
                  </Link>
                </div>
              ) : loadingProfile ? (
                <div className="flex items-center gap-3 py-12 text-sm text-vault-muted">
                  <LoaderCircle className="animate-spin" size={20} />
                  Loading account details...
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-6 space-y-5">
                  <div>
                    <label className="text-sm font-medium text-white">
                      Email address
                    </label>
                    <input
                      value={email}
                      readOnly
                      className={`${inputClass} cursor-not-allowed opacity-60`}
                    />
                    <p className="mt-2 text-xs text-vault-muted">
                      Email changes are not available in this settings page.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="settings-username"
                      className="text-sm font-medium text-white"
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
                    <p className="mt-2 text-xs text-vault-muted">
                      3–20 characters: letters, numbers, and underscores.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="settings-display-name"
                      className="text-sm font-medium text-white"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-vault-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-vault-purple/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <Save size={17} />
                      )}
                      {savingProfile ? 'Saving...' : 'Save changes'}
                    </button>

                    <Link
                      to={user?.id ? `/profile/${user.id}` : '/login'}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.05]"
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
                icon={LockKeyhole}
                title="Security"
                description="Keep your Anime Vault account secure."
              />

              {!user ? (
                <p className="py-8 text-sm text-vault-muted">
                  Sign in to manage your account security.
                </p>
              ) : (
                <form onSubmit={changePassword} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="current-password"
                      className="text-sm font-medium text-white"
                    >
                      Current password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-password"
                      className="text-sm font-medium text-white"
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
                        className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-vault-muted hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-vault-muted">
                      Use at least 8 characters.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="text-sm font-medium text-white"
                    >
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className={inputClass}
                      minLength={8}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-vault-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-vault-purple/80 disabled:opacity-60"
                  >
                    {changingPassword ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <LockKeyhole size={17} />
                    )}
                    {changingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              )}

              <div className="mt-8 border-t border-white/[0.07] pt-6">
                <h3 className="font-medium text-white">Sign out</h3>
                <p className="mt-1 text-sm text-vault-muted">
                  Sign out of Anime Vault on this device.
                </p>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut || !user}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {signingOut ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <LogOut size={17} />
                  )}
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section>
              <SectionHeading
                icon={Palette}
                title="Appearance"
                description="Customize how Anime Vault looks on this device."
              />

              <SettingRow
                title="Dark appearance"
                description="Keep the dark interface enabled for a comfortable viewing experience."
              >
                <Toggle
                  checked={darkMode}
                  onChange={setDarkMode}
                  label="Dark appearance"
                />
              </SettingRow>

              <SettingRow
                title="Reduce motion"
                description="A preference for fewer animations. Components must support this setting for it to affect them."
              >
                <Toggle
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  label="Reduce motion"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#0d0d16] p-4">
                <div className="flex items-center gap-3">
                  <Monitor size={20} className="text-vault-accent" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Current theme
                    </p>
                    <p className="mt-1 text-xs text-vault-muted">
                      {darkMode
                        ? 'Dark mode preference is enabled.'
                        : 'Light mode preference is saved, but the app currently uses its dark styling.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'playback' && (
            <section>
              <SectionHeading
                icon={Play}
                title="Playback"
                description="Choose how videos should behave."
              />

              <SettingRow
                title="Autoplay videos"
                description="Allow supported video players to start playback automatically."
              >
                <Toggle
                  checked={autoplay}
                  onChange={setAutoplay}
                  label="Autoplay videos"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#0d0d16] p-4 text-sm leading-6 text-vault-muted">
                These preferences are saved in this browser. The video player
                must read them for autoplay or other playback behavior to
                change.
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section>
              <SectionHeading
                icon={Bell}
                title="Notifications"
                description="Manage the updates you want to receive."
              />

              <SettingRow
                title="Email notifications"
                description="Preference for account and activity emails."
              >
                <Toggle
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                  label="Email notifications"
                />
              </SettingRow>

              <SettingRow
                title="Product updates"
                description="Preference for announcements about new Anime Vault features."
              >
                <Toggle
                  checked={productUpdates}
                  onChange={setProductUpdates}
                  label="Product updates"
                />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#0d0d16] p-4 text-sm leading-6 text-vault-muted">
                These notification switches currently save your preferences in
                this browser. Actual emails require a notification service to
                be connected.
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-vault-surface p-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-vault-accent" />
        <p className="text-xs leading-6 text-vault-muted">
          Account changes are stored in Supabase. Appearance, playback, and
          notification preferences are stored locally in this browser.
        </p>
      </div>
    </div>
  )
}
