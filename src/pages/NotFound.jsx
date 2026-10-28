import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Home,
  Search,
  Sparkles,
  Tv,
} from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-[75vh] items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vault-purple/10 blur-[100px]" />
        <div className="absolute left-[10%] top-[15%] h-32 w-32 rounded-full bg-vault-purple/10 blur-[70px]" />
        <div className="absolute bottom-[10%] right-[10%] h-40 w-40 rounded-full bg-fuchsia-500/10 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-auto w-full max-w-2xl text-center"
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-vault-purple/25 bg-vault-purple/10 shadow-[0_0_60px_rgba(139,92,246,0.12)] sm:h-36 sm:w-36"
        >
          <Tv size={58} strokeWidth={1.3} className="text-vault-accent sm:hidden" />
          <Tv size={72} strokeWidth={1.3} className="hidden text-vault-accent sm:block" />

          <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-vault-card text-vault-accent">
            <Sparkles size={17} />
          </span>
        </motion.div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-vault-accent">
          Lost in another dimension?
        </p>

        <h1 className="text-7xl font-black tracking-tighter text-white sm:text-9xl">
          4<span className="vault-gradient bg-clip-text text-transparent">0</span>4
        </h1>

        <h2 className="mt-5 text-xl font-bold text-white sm:text-2xl">
          This page has gone off the grid.
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-vault-muted sm:text-base">
          Looks like this page isn't in our anime database. It may have moved,
          or the link you followed might be incorrect.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-vault-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-vault-purple/20 transition hover:-translate-y-0.5 hover:bg-vault-purple/85"
          >
            <Home size={18} />
            Back to home
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-vault-purple/40 hover:bg-vault-purple/10"
          >
            <Compass size={18} />
            Explore anime
          </Link>
        </div>

        <div className="mx-auto mt-10 flex max-w-sm items-center gap-3 rounded-2xl border border-white/[0.07] bg-vault-surface/80 p-4 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-vault-accent">
            <Search size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">
              Looking for something?
            </p>
            <p className="mt-1 text-xs text-vault-muted">
              Search the Anime Vault collection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/search')}
            aria-label="Go to anime search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white transition hover:bg-vault-purple/20"
          >
            <ArrowRight size={17} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-8 inline-flex items-center gap-2 text-sm text-vault-muted transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Go back to the previous page
        </button>

        <p className="mt-10 text-xs tracking-wide text-white/25">
          ANIME VAULT · EVERY STORY HAS A HOME
        </p>
      </motion.div>
    </main>
  )
}
