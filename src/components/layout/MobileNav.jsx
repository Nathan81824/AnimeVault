import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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
  Bell,
  LogIn,
  ChevronRight,
  Flame,
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
  { label: 'Subscriptions', to: '/subscriptions', icon: Bell },
  { label: 'My Vault', to: '/my-vault', icon: Library },
  { label: 'Upload Video', to: '/upload', icon: Upload },
  { label: 'Profile', to: '/profile/me', icon: UserRound },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export default function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const closeMenu = () => setMenuOpen(false)

  const handleSearch = () => {
    closeMenu()
    navigate('/search')
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#09090f]/95 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
          {bottomLinks.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 transition ${
                  isActive
                    ? 'text-purple-400'
                    : 'text-gray-500 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span className="text-[10px] font-medium">{label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-purple-500" />
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
              menuOpen
                ? 'text-purple-400'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            <Menu size={21} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="absolute inset-y-0 right-0 flex w-[min(85%,340px)] flex-col border-l border-white/10 bg-[#0d0d16] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
                  <Clapperboard size={22} />
                </div>

                <div>
                  <h2 className="font-extrabold">
                    Anime<span className="text-purple-400">Vault</span>
                  </h2>
                  <p className="text-xs text-gray-500">Your anime universe</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={21} />
              </button>
            </div>

            <div className="p-4">
              <button
                type="button"
                onClick={handleSearch}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-gray-400 transition hover:border-purple-500/50"
              >
                <Search size={18} />
                Search anime...
                <ChevronRight size={16} className="ml-auto" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-gray-600">
                Navigation
              </p>

              <div className="space-y-1">
                {menuLinks.map(({ label, to, icon: Icon, end }) => (
                  <NavLink
                    key={label}
                    to={to}
                    end={end}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={19} />
                    {label}
                    <ChevronRight
                      size={15}
                      className="ml-auto opacity-40"
                    />
                  </NavLink>
                ))}
              </div>

              <div className="my-5 border-t border-white/10" />

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.08] p-4">
                <h3 className="text-sm font-bold">Keep exploring</h3>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Find your next favorite anime and build your collection.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu()
                    navigate('/explore')
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 py-2.5 text-sm font-semibold transition hover:bg-purple-500"
                >
                  Explore anime
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  navigate('/login')
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold transition hover:border-purple-500/50 hover:bg-purple-500/10"
              >
                <LogIn size={18} />
                Sign in
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}