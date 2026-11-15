
import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Search,
  Menu,
  X,
  UserRound,
  Library,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  Compass,
  Home,
  Clapperboard,
} from 'lucide-react'
import { useAuthStore } from '../../features/auth/authStore'

const navLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Shorts', path: '/shorts', icon: Clapperboard },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const fetchMyProfile = useAuthStore((state) => state.fetchMyProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)

  useEffect(() => {
    if (user?.id && !profile) {
      fetchMyProfile()
    }
  }, [user?.id, profile, fetchMyProfile])

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [user?.id])

  useEffect(() => {
    if (!mobileOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [mobileOpen])

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

  const profilePath = '/profile/'
  const channelPath = user?.id ? `/channel/${user.id}` : '/channel'

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
    { label: 'My Channel', path: channelPath, icon: Clapperboard },
    { label: 'My Vault', path: '/my-vault', icon: Library },
    { label: 'Upload Video', path: '/upload', icon: Upload },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  const Avatar = ({ size = 'h-9 w-9' }) => (
    <span
      className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/40 bg-gradient-to-br from-orange-400 to-orange-600 font-black text-white`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${displayName}'s profile`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        initial
      )}
    </span>
  )

  return (
    <header className="sticky top-0 z-[100] isolate w-full border-b border-white/10 bg-[#09090b]/95 text-white shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          onClick={closeMenus}
          className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2"
          aria-label="Anime Vault home"
        >
          <img
            src={`${import.meta.env.BASE_URL}anime-vault-logo.png`}
            alt="Anime Vault"
            className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
          />

          <span className="whitespace-nowrap text-base font-black tracking-tight sm:text-xl">
            Anime<span className="text-orange-500">Vault</span>
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
                `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              closeMenus()
              navigate('/search')
            }}
            aria-label="Search anime"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-orange-400"
          >
            <Search size={20} />
          </button>

          {!user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:text-orange-400"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/15 transition hover:bg-orange-400"
              >
                Get Started
              </Link>
            </div>
          )}

          {user && (
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
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 pr-2 transition hover:border-orange-500/40 hover:bg-white/10"
              >
                <Avatar />

                <ChevronDown
                  size={15}
                  className={`text-zinc-400 transition-transform ${
                    profileOpen ? 'rotate-180 text-orange-400' : ''
                  }`}
                />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[120] mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl shadow-black/50"
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

                      <span className="block truncate text-xs text-zinc-500">
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
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-orange-300"
                    >
                      <Icon size={17} />
                      {label}
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
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {user && (
            <Link
              to={profilePath}
              onClick={closeMenus}
              aria-label="Go to your profile"
              className="flex shrink-0 items-center justify-center rounded-full transition hover:scale-105 sm:hidden"
            >
              <Avatar size="h-9 w-9" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileOpen((open) => !open)
              setProfileOpen(false)
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-orange-400 sm:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[998] bg-black/40 sm:hidden"
          />

          <div className="absolute left-0 right-0 top-full z-[999] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-white/10 bg-[#0d0d0f] px-4 py-5 shadow-2xl shadow-black/50 sm:hidden">
            <nav
              className="flex flex-col gap-1"
              aria-label="Mobile navigation"
            >
              {navLinks.map(({ name, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={closeMenus}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
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
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                >
                  <Avatar size="h-11 w-11" />

                  <span className="min-w-0">
                    <span className="block truncate font-bold text-white">
                      {displayName}
                    </span>

                    <span className="block text-xs text-orange-400">
                      View your profile
                    </span>
                  </span>
                </Link>

                <div className="mt-3 flex flex-col gap-1">
                  {profileItems.map(({ label, path, icon: Icon }) => (
                    <Link
                      key={label}
                      to={path}
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-orange-300"
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
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-orange-500/40 hover:text-orange-400"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  onClick={closeMenus}
                  className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )
}
