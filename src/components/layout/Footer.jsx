
import { Link } from 'react-router-dom'
import {
  FaGithub,
  FaInstagram,
  FaYoutube,
  FaDiscord,
  FaHeart,
} from 'react-icons/fa'
import {
  FiArrowUpRight,
  FiCompass,
  FiPlay,
  FiBookmark,
  FiUser,
  FiSettings,
  FiStar,
} from 'react-icons/fi'

const footerLinks = {
  Discover: [
    { label: 'Home', to: '/', icon: FiPlay },
    { label: 'Explore Anime', to: '/explore', icon: FiCompass },
    { label: 'Search Anime', to: '/search', icon: FiStar },
    { label: 'Anime Shorts', to: '/shorts', icon: FiPlay },
  ],
  Library: [
    { label: 'My Vault', to: '/my-vault', icon: FiBookmark },
    { label: 'Upload Video', to: '/upload', icon: FiPlay },
    { label: 'My Profile', to: '/profile/', icon: FiUser },
    { label: 'Settings', to: '/settings', icon: FiSettings },
  ],
  Account: [
    { label: 'Sign In', to: '/login' },
    { label: 'Create Account', to: '/signup' },
  ],
}

const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/',
    icon: FaGithub,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    icon: FaInstagram,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/',
    icon: FaYoutube,
  },
  {
    label: 'Discord',
    href: 'https://discord.com/',
    icon: FaDiscord,
  },
]

function FooterLink({ label, to, icon: Icon }) {
  return (
    <Link
      to={to}
      className="group flex w-fit items-center gap-3 text-sm text-gray-500 transition-all duration-300 hover:translate-x-1 hover:text-orange-400"
    >
      {Icon && (
        <Icon className="text-base text-gray-600 transition-colors group-hover:text-orange-500" />
      )}

      <span>{label}</span>

      <FiArrowUpRight className="text-xs opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-orange-500/15 bg-[#080808] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-orange-500/[0.09] blur-[120px]" />

      <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-orange-600/[0.06] blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-7 pt-14 sm:px-8 sm:pt-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-14">

          <div>
            <Link
              to="/"
              aria-label="AnimeVault home"
              className="group inline-flex items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-orange-500/20 bg-white/[0.04] shadow-lg shadow-orange-500/10 transition duration-300 group-hover:scale-105 group-hover:border-orange-500/50">
                <img
                  src={`${import.meta.env.BASE_URL}anime-vault-logo.png`}
                  alt="AnimeVault logo"
                  className="h-full w-full object-contain p-1.5"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Anime<span className="text-orange-500">Vault</span>
                </h2>

                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500">
                  Your anime universe
                </p>
              </div>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-7 text-gray-500">
              Discover amazing anime, explore unforgettable stories,
              watch exciting shorts, and build a collection of
              everything you love.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg text-gray-400 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <Icon />
                </a>
              ))}
            </div>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-orange-500/15 bg-orange-500/[0.06] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />

              <span className="text-[11px] font-semibold text-orange-400">
                Made for anime lovers
              </span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="mb-6 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-white">
                <span className="h-5 w-1 rounded-full bg-orange-500" />
                {heading}
              </h3>

              <ul className="space-y-5">
                {links.map((link) => (
                  <li key={link.label}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="my-12 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />

        <div className="relative mb-10 overflow-hidden rounded-2xl border border-orange-500/15 bg-gradient-to-r from-orange-500/[0.09] via-orange-500/[0.03] to-transparent p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-xl text-orange-400">
                <FiStar />
              </div>

              <div>
                <h3 className="text-base font-extrabold">
                  Ready for your next adventure?
                </h3>

                <p className="mt-1 max-w-md text-xs leading-6 text-gray-500">
                  Explore anime worlds and discover something new to watch.
                </p>
              </div>
            </div>

            <Link
              to="/explore"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/20"
            >
              Explore Anime
              <FiArrowUpRight className="text-base" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">
              © {currentYear}{' '}
              <span className="font-bold text-white">AnimeVault</span>.
              All rights reserved.
            </p>

            <p className="mt-1 text-[10px] text-gray-700">
              Anime information powered by Jikan API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-gray-500">
            <Link
              to="/settings"
              className="transition hover:text-orange-400"
            >
              Preferences
            </Link>

            <a
              href="https://myanimelist.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition hover:text-orange-400"
            >
              MyAnimeList
              <FiArrowUpRight />
            </a>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            Built with <FaHeart className="text-orange-500" /> for anime fans
          </p>
        </div>
      </div>
    </footer>
  )
}
