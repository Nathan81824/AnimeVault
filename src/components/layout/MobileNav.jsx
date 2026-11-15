
import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/authStore'
import {
  House,
  Compass,
  Clapperboard,
  Library,
  Menu,
  X,
  Search,
  Upload,
  UserRound,
  Settings,
  ChevronRight,
  Flame,
  Sparkles,
  LogOut,
} from 'lucide-react'

const bottomLinks = [
  { label: 'Home', to: '/', icon: House, end: true },
  { label: 'Explore', to: '/explore', icon: Compass },
  { label: 'Shorts', to: '/shorts', icon: Clapperboard },
  { label: 'My Vault', to: '/my-vault', icon: Library },
]

const menuLinks = [
  { label: 'Home', to: '/', icon: House, end: true },
  { label: 'Explore Anime', to: '/explore', icon: Compass },
  { label: 'Trending', to: '/explore?sort=popular', icon: Flame },
  { label: 'Anime Shorts', to: '/shorts', icon: Clapperboard },
  { label: 'My Vault', to: '/my-vault', icon: Library },
  { label: 'Upload Video', to: '/upload', icon: Upload },
  { label: 'My Profile', to: '/profile/', icon: UserRound },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export default function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const {
    user,
    profile,
    fetchMyProfile,
    signOut,
    isSubmitting,
  } = useAuthStore()

  useEffect(() => {
    if (user?.id && !profile) {
      fetchMyProfile()
    }
  }, [user?.id, profile, fetchMyProfile])

  const displayName =
    profile?.displayName ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Anime Fan'

  const username = profile?.username || user?.user_metadata?.username

  const avatarUrl =
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.avatarUrl ||
    null

  const initial = displayName.charAt(0).toUpperCase()

  const closeMenu = () => setMenuOpen(false)

  const handleSearch = () => {
    closeMenu()
    navigate('/search')
  }

  const handleSignOut = async () => {
    closeMenu()
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    if (!menuOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-500/20 bg-[#09090b]/95 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
          {bottomLinks.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-full flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  isActive
                    ? 'text-orange-400'
                    : 'text-gray-500 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-semibold">
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.7)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open more navigation options"
            aria-expanded={menuOpen}
            className={`flex h-full flex-col items-center justify-center gap-1 transition ${
              menuOpen ? 'text-orange-400' : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <aside className="absolute inset-y-0 right-0 flex w-[min(86%,360px)] flex-col border-l border-orange-500/20 bg-[#0c0c0f] text-white shadow-2xl shadow-black/60 animate-[slideIn_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20">
                  <Clapperboard size={23} className="text-black" />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Anime<span className="text-orange-500">Vault</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Your anime universe
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-gray-400 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <button
                type="button"
                onClick={handleSearch}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left text-sm text-gray-400 transition hover:border-orange-500/40 hover:bg-orange-500/[0.05]"
              >
                <Search size={18} className="text-orange-500" />
                Search anime...
                <ChevronRight size={16} className="ml-auto" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-5">
              <div className="mb-3 flex items-center justify-between px-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600">
                  Navigation
                </p>
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              </div>

              <div className="space-y-1.5">
                {menuLinks.map(({ label, to, icon: Icon, end }) => (
                  <NavLink
                    key={label}
                    to={to}
                    end={end}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'border border-orange-500/20 bg-orange-500/10 text-orange-400'
                          : 'border border-transparent text-gray-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            isActive
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-white/[0.04] text-gray-500 group-hover:bg-orange-500/10 group-hover:text-orange-400'
                          }`}
                        >
                          <Icon size={18} />
                        </span>

                        {label}

                        <ChevronRight
                          size={16}
                          className={`ml-auto transition ${
                            isActive
                              ? 'text-orange-400'
                              : 'text-gray-700 group-hover:translate-x-1 group-hover:text-orange-400'
                          }`}
                        />
                      </>
                    )}
                  </NavLink>
                ))}
              </div>

              <div className="my-5 border-t border-white/10" />

              <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/[0.04] to-transparent p-4">
                <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />

                <div className="relative">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <Sparkles size={19} />
                  </div>

                  <h3 className="text-sm font-extrabold">
                    Keep exploring
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Discover new anime, watch shorts, and build your collection.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      navigate('/explore')
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-sm font-bold text-black transition hover:bg-orange-400 active:scale-[0.98]"
                  >
                    Explore anime
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/20 p-4">
              {user ? (
                <div className="space-y-3">
                  <Link
                    to="/profile/"
                    onClick={closeMenu}
                    className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] p-3 transition hover:bg-orange-500/10"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-orange-500 bg-orange-500/15 text-lg font-black text-orange-400">
                      {avatarUrl && (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      {initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {username ? `@${username}` : 'View your profile'}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-orange-400"
                    />
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <LogOut size={17} />
                    {isSubmitting ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3.5 text-sm font-bold text-orange-400 transition hover:bg-orange-500/10"
                >
                  <UserRound size={18} />
                  Sign in
                </Link>
              )}

              <p className="mt-3 text-center text-[10px] text-gray-600">
                AnimeVault · Your anime universe
              </p>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0.7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
