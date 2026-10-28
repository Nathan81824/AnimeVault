import { Link } from 'react-router-dom'

const footerLinks = {
  Discover: [
    { label: 'Home', to: '/' },
    { label: 'Explore Anime', to: '/explore' },
    { label: 'Search', to: '/search' },
    { label: 'Anime Shorts', to: '/shorts' },
  ],
  Library: [
    { label: 'My Vault', to: '/my-vault' },
    { label: 'Subscriptions', to: '/subscriptions' },
    { label: 'Upload Video', to: '/upload' },
  ],
  Account: [
    { label: 'My Profile', to: '/profile' },
    { label: 'Settings', to: '/settings' },
    { label: 'Sign In', to: '/login' },
    { label: 'Create Account', to: '/signup' },
  ],
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/[0.07] bg-[#09090f]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-vault-purple/[0.08] blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-8 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Link
              to="/"
              aria-label="Anime Vault home"
              className="inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vault-purple text-xl font-black text-white shadow-lg shadow-vault-purple/20">
                AV
              </span>

              <span className="text-xl font-bold tracking-tight text-white">
                Anime<span className="text-vault-accent">Vault</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-vault-muted">
              Your next favorite anime is waiting. Discover new worlds,
              explore unforgettable stories, and build your personal anime
              collection.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-vault-muted transition hover:border-vault-purple/40 hover:bg-vault-purple/10 hover:text-white"
              >
                YouTube ↗
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-vault-muted transition hover:border-vault-purple/40 hover:bg-vault-purple/10 hover:text-white"
              >
                Instagram ↗
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="mb-5 text-sm font-semibold text-white">
                {heading}
              </h3>

              <ul className="space-y-3.5">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="inline-flex items-center gap-1 text-sm text-vault-muted transition hover:translate-x-1 hover:text-vault-accent"
                    >
                      {label}
                      <span aria-hidden="true" className="text-xs">
                        ↗
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="my-9 border-t border-white/[0.07] sm:my-12" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-vault-muted">
            © {currentYear} Anime Vault. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-vault-muted">
            <Link
              to="/settings"
              className="transition hover:text-white"
            >
              Preferences
            </Link>

            <a
              href="https://myanimelist.net/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Anime data by Jikan ↗
            </a>
          </div>

          <p className="text-xs text-vault-muted">
            Made for anime fans <span className="text-vault-purple">♥</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
