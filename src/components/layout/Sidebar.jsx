
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Compass,
  PlaySquare,
  Bookmark,
  Users,
  Upload,
  Settings,
  Flame,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserRound,
} from 'lucide-react'
import { useAuthStore } from '../../features/auth/authStore'

const mainLinks = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Explore', path: '/explore', icon: Compass },
  { label: 'Shorts', path: '/shorts', icon: PlaySquare },
]

const libraryLinks = [
  { label: 'My Vault', path: '/my-vault', icon: Bookmark },
  { label: 'Subscriptions', path: '/subscriptions', icon: Users },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
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
    user?.user_metadata?.name ||
    user?.username ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Your profile'

  const avatarUrl =
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.avatarUrl ||
    null

  const avatarLetter = displayName.charAt(0).toUpperCase()
  const profilePath = user?.id ? `/profile/${user.id}` : '/profile'

  const handleSignOut = async () => {
    if (isSubmitting) return

    const result = await signOut()

    if (result !== false) {
      navigate('/login', { replace: true })
    }
  }

  const navClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-vault-purple/15 text-vault-accent'
        : 'text-vault-muted hover:bg-white/5 hover:text-vault-text'
    } ${collapsed ? 'justify-center' : ''}`

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/5 bg-vault-bg transition-[width] duration-300 lg:flex ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-16 items-center border-b border-white/5 px-3 ${
          collapsed ? 'justify-center' : 'justify-between px-5'
        }`}
      >
        {!collapsed && (
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vault-purple text-white">
              <Flame size={20} />
            </span>

            <span className="truncate text-lg font-black tracking-tight text-vault-text">
              Anime<span className="text-vault-accent">Vault</span>
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-vault-muted transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="mb-6">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-vault-muted/70">
              Discover
            </p>
          )}

          <nav className="space-y-1" aria-label="Main navigation">
            {mainLinks.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={navClass}
                title={collapsed ? label : undefined}
              >
                <Icon size={19} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mb-6">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-vault-muted/70">
              Your Library
            </p>
          )}

          <nav className="space-y-1" aria-label="Your library">
            {libraryLinks.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={navClass}
                title={collapsed ? label : undefined}
              >
                <Icon size={19} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mb-6">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-vault-muted/70">
              Create
            </p>
          )}

          <nav className="space-y-1" aria-label="Create">
            <NavLink
              to="/upload"
              className={navClass}
              title={collapsed ? 'Upload' : undefined}
            >
              <Upload size={19} className="shrink-0" />
              {!collapsed && <span>Upload</span>}
            </NavLink>

            <NavLink
              to="/settings"
              className={navClass}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings size={19} className="shrink-0" />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/5 p-3">
        {user ? (
          <div className="space-y-2">
            <Link
              to={profilePath}
              title={collapsed ? displayName : undefined}
              aria-label="Open your profile"
              className={`flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vault-purple/20 text-sm font-bold text-vault-accent">
                  {avatarLetter}
                </div>
              )}

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-vault-text">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-vault-muted">
                    {user.email || 'View your profile'}
                  </p>
                </div>
              )}

              {!collapsed && (
                <UserRound
                  size={16}
                  className="shrink-0 text-vault-muted"
                />
              )}
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSubmitting}
              title={collapsed ? 'Sign out' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut size={19} className="shrink-0" />
              {!collapsed && (
                <span>{isSubmitting ? 'Signing out...' : 'Sign out'}</span>
              )}
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            title={collapsed ? 'Sign in' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-vault-text transition hover:bg-white/5 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogIn size={19} className="shrink-0" />
            {!collapsed && <span>Sign in</span>}
          </Link>
        )}
      </div>
    </aside>
  )
}
