
import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiCompass,
  FiPlay,
  FiBookmark,
  FiUsers,
  FiUpload,
  FiSettings,
  FiLogIn,
  FiLogOut,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
} from 'react-icons/fi'
import { useAuthStore } from '../../features/auth/authStore'

const SIDEBAR_STORAGE_KEY = 'anime-vault-sidebar-collapsed'

const mainLinks = [
  { label: 'Home', path: '/', icon: FiHome },
  { label: 'Explore', path: '/explore', icon: FiCompass },
  { label: 'Shorts', path: '/shorts', icon: FiPlay },
]

const libraryLinks = [
  { label: 'My Vault', path: '/my-vault', icon: FiBookmark },
  { label: 'Channels', path: '/channels', icon: FiUsers },
]

function getDisplayName(profile, user) {
  return (
    profile?.displayName ||
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.user_metadata?.name ||
    user?.username ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Your profile'
  )
}

function getAvatarUrl(profile, user) {
  return (
    profile?.avatarUrl ||
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.avatarUrl ||
    null
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const signOut = useAuthStore((state) => state.signOut)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch {
      // Storage may be unavailable.
    }
  }, [collapsed])

  const displayName = getDisplayName(profile, user)
  const avatarUrl = getAvatarUrl(profile, user)
  const avatarLetter = displayName.charAt(0).toUpperCase()

  const profilePath = user?.id
    ? `/profile/${user.id}`
    : '/login'

  const handleSignOut = async () => {
    if (isSubmitting) return

    const result = await signOut()

    if (result !== false) {
      navigate('/login', { replace: true })
    }
  }

  const navClass = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-orange-500/10 text-orange-400 shadow-sm shadow-orange-500/5'
        : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
    } ${collapsed ? 'justify-center' : ''}`

  const renderLinks = (links) =>
    links.map(({ label, path, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={path === '/'}
        className={navClass}
        title={collapsed ? label : undefined}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-orange-500" />
            )}

            <Icon
              className={`shrink-0 text-[19px] transition-transform duration-200 ${
                isActive
                  ? 'text-orange-400'
                  : 'group-hover:scale-110'
              }`}
            />

            {!collapsed && <span>{label}</span>}
          </>
        )}
      </NavLink>
    ))

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#080808] transition-[width] duration-300 lg:flex ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-white/[0.06] px-3 ${
          collapsed ? 'justify-center' : 'justify-between px-5'
        }`}
      >
        {!collapsed && (
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/20 transition-transform group-hover:scale-105">
              <FiZap className="text-xl" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-black tracking-tight text-white">
                Anime<span className="text-orange-500">Vault</span>
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600">
                Your anime universe
              </p>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-orange-500/10 hover:text-orange-400"
        >
          {collapsed ? (
            <FiChevronRight className="text-lg" />
          ) : (
            <FiChevronLeft className="text-lg" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="mb-7">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600">
              Discover
            </p>
          )}

          <nav className="space-y-1" aria-label="Main navigation">
            {renderLinks(mainLinks)}
          </nav>
        </div>

        <div className="mb-7">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600">
              Your Library
            </p>
          )}

          <nav className="space-y-1" aria-label="Your library">
            {renderLinks(libraryLinks)}
          </nav>
        </div>

        <div className="mb-7">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600">
              Create
            </p>
          )}

          <nav className="space-y-1" aria-label="Create">
            <NavLink
              to="/upload"
              className={navClass}
              title={collapsed ? 'Upload' : undefined}
            >
              {({ isActive }) => (
                <>
                  <FiUpload
                    className={`shrink-0 text-[19px] ${
                      isActive ? 'text-orange-400' : ''
                    }`}
                  />
                  {!collapsed && <span>Upload</span>}
                </>
              )}
            </NavLink>

            <NavLink
              to="/settings"
              className={navClass}
              title={collapsed ? 'Settings' : undefined}
            >
              {({ isActive }) => (
                <>
                  <FiSettings
                    className={`shrink-0 text-[19px] ${
                      isActive ? 'text-orange-400' : ''
                    }`}
                  />
                  {!collapsed && <span>Settings</span>}
                </>
              )}
            </NavLink>
          </nav>
        </div>

        {!collapsed && (
          <div className="mt-8 rounded-2xl border border-orange-500/10 bg-gradient-to-br from-orange-500/[0.09] to-transparent p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <FiZap className="text-lg" />
            </div>

            <h3 className="text-xs font-extrabold text-white">
              Your next anime awaits
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              Discover something new and add it to your collection.
            </p>

            <Link
              to="/explore"
              className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-orange-400 transition hover:text-orange-300"
            >
              Explore now <span>→</span>
            </Link>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {user ? (
          <div className="space-y-2">
            <Link
              to={profilePath}
              title={collapsed ? 'Open your profile' : undefined}
              aria-label="Open your profile"
              className={`group flex items-center gap-3 rounded-xl p-2 transition hover:bg-orange-500/[0.08] ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-9 w-9 shrink-0 rounded-full border border-orange-500/30 object-cover transition group-hover:border-orange-400"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-sm font-black text-orange-400">
                  {avatarLetter}
                </div>
              )}

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition group-hover:text-orange-400">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    View your profile
                  </p>
                </div>
              )}

              {!collapsed && (
                <FiUser className="shrink-0 text-base text-gray-600 transition group-hover:text-orange-400" />
              )}
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSubmitting}
              title={collapsed ? 'Sign out' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <FiLogOut className="shrink-0 text-[19px]" />
              {!collapsed && (
                <span>
                  {isSubmitting ? 'Signing out...' : 'Sign out'}
                </span>
              )}
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            title={collapsed ? 'Sign in' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition hover:bg-orange-500/10 hover:text-orange-400 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <FiLogIn className="shrink-0 text-[19px]" />
            {!collapsed && <span>Sign in</span>}
          </Link>
        )}
      </div>
    </aside>
  )
}
