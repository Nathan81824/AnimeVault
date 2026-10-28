
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Search,
  Menu,
  X,
  UserRound,
  Library,
  CreditCard,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  Compass,
  Home,
} from 'lucide-react'
import { useAuthStore } from '../../features/auth/authStore'

const navLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Shorts', path: '/shorts' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const signOut = useAuthStore((state) => state.signOut)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)

  const displayName =
    profile?.displayName ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Anime Fan'

  const avatarUrl =
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.avatarUrl ||
    null

  const initial = displayName.charAt(0).toUpperCase()
  const profilePath = user?.id ? `/profile/${user.id}` : '/profile'

  const closeMenus = () => {
    setMobileOpen(false)
    setProfileOpen(false)
  }

  const handleSignOut = async () => {
    closeMenus()
    const result = await signOut()

    if (result !== false) {
      navigate('/login', { replace: true })
    }
  }

  const profileItems = [
    { label: 'My Profile', path: profilePath, icon: UserRound },
    { label: 'My Vault', path: '/my-vault', icon: Library },
    { label: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { label: 'Upload Video', path: '/upload', icon: Upload },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  const Avatar = ({ size = 'h-8 w-8' }) =>
    avatarUrl ? (
      <img
        src={avatarUrl}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    ) : (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-vault-purple font-bold text-white`}
      >
        {initial}
      </span>
    )

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-vault-bg/90 text-vault-text shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          onClick={closeMenus}
          className="flex shrink-0 items-center gap-2"
          aria-label="Anime Vault home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-purple text-lg font-black text-white shadow-lg shadow-vault-purple/20">
            A
          </span>
          <span className="text-lg font-black tracking-tight sm:text-xl">
            Anime<span className="text-vault-accent">Vault</span>
          </span>
        </Link>

        <nav
          className="ml-5 hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map(({ name, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-vault-purple/15 text-vault-accent'
                    : 'text-vault-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              closeMenus()
              navigate('/search')
            }}
            aria-label="Search anime"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-vault-muted transition hover:bg-white/5 hover:text-white"
          >
            <Search size={20} />
          </button>

          {user ? (
            <div
              className="relative hidden sm:block"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setProfileOpen(false)
              }}
            >
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 pr-2 transition hover:border-vault-purple/50 hover:bg-white/10"
              >
                <Avatar />
                <ChevronDown
                  size={15}
                  className={`text-vault-muted transition-transform ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-vault-surface p-2 shadow-2xl shadow-black/40"
                >
                  <Link
                    to={profilePath}
                    role="menuitem"
                    onClick={closeMenus}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5"
                  >
                    <Avatar size="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">
                        {displayName}
                      </span>
                      <span className="block truncate text-xs text-vault-muted">
                        View your profile
                      </span>
                    </span>
                  </Link>

                  <div className="my-2 border-t border-white/10" />

                  {profileItems.map(({ label, path, icon: Icon }) => (
                    <Link
                      key={label}
                      to={path}
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-vault-muted transition hover:bg-vault-purple/10 hover:text-white"
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                    </Link>
                  ))}

                  <div className="my-2 border-t border-white/10" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSubmitting}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <LogOut size={17} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-vault-muted transition hover:text-white"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-vault-purple px-4 py-2 text-sm font-bold text-white transition hover:bg-vault-purple/80"
              >
                Get Started
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileOpen((open) => !open)
              setProfileOpen(false)
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-vault-muted transition hover:bg-white/5 hover:text-white sm:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-vault-bg px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={closeMenus}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-vault-purple/15 text-vault-accent'
                      : 'text-vault-muted hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {name}
              </NavLink>
            ))}
          </nav>

          <div className="my-4 border-t border-white/10" />

          {user ? (
            <>
              <Link
                to={profilePath}
                onClick={closeMenus}
                className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/5"
              >
                <Avatar size="h-11 w-11" />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">
                    {displayName}
                  </span>
                  <span className="block text-xs text-vault-muted">
                    View your profile
                  </span>
                </span>
              </Link>

              <div className="mt-2 flex flex-col gap-1">
                {profileItems.map(({ label, path, icon: Icon }) => (
                  <Link
                    key={label}
                    to={path}
                    onClick={closeMenus}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-vault-muted transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={closeMenus}
                className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={closeMenus}
                className="rounded-xl bg-vault-purple px-4 py-3 text-center text-sm font-bold text-white"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
