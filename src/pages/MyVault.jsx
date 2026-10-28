import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Search,
  Trash2,
  Play,
  Sparkles,
  Library,
  RefreshCw,
  Star,
  Clapperboard,
  Clock3,
  Compass,
  X,
  ArrowRight,
  ShieldCheck,
  Film,
  Heart,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'
import { getPopularAnime } from '../lib/jikan'

function formatScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  return score > 10 ? (score / 10).toFixed(1) : score.toFixed(1)
}

function getStatus(status) {
  const statuses = {
    FINISHED: 'Finished',
    RELEASING: 'Airing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'On hiatus',
  }

  return statuses[status] || status || null
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#11111b]">
      <div className="aspect-[3/4] animate-pulse bg-white/[0.05]" />
      <div className="space-y-3 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-white/[0.06]" />
      </div>
    </div>
  )
}

function AnimeCard({ anime, onRemove, removing }) {
  const title = anime.anime_title || 'Untitled Anime'
  const image = anime.anime_image
  const score = formatScore(anime.anime_score)
  const status = getStatus(anime.anime_status)

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11111b] transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-xl hover:shadow-violet-950/10">
      <Link
        to={`/anime/${anime.anime_id}`}
        aria-label={`View ${title}`}
        className="relative block aspect-[3/4] overflow-hidden bg-[#191926]"
      >
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-violet-300">
            <Library size={42} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent opacity-90" />

        {score && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <Star size={13} fill="currentColor" className="text-amber-300" />
            {score}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition group-hover:text-violet-200 sm:text-base">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
            {anime.anime_episodes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clapperboard size={13} />
                {anime.anime_episodes} eps
              </span>
            )}

            {status && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-xl bg-violet-600 text-white opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play size={16} fill="currentColor" />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-violet-300">
          <Bookmark size={13} fill="currentColor" />
          <span className="truncate">In your vault</span>
        </span>

        <button
          type="button"
          onClick={() => onRemove(anime)}
          disabled={removing}
          aria-label={`Remove ${title} from your vault`}
          title="Remove from vault"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removing ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
        </button>
      </div>
    </article>
  )
}

function RecommendationCard({ anime }) {
  const title = anime.title || anime.titleEnglish || 'Untitled Anime'
  const image = anime.image || anime.coverImage?.large
  const score = formatScore(anime.score)

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11111b] transition duration-300 hover:-translate-y-1 hover:border-violet-400/30"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#191926]">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-violet-300">
            <Film size={30} />
          </div>
        )}

        {score && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur">
            <Star size={12} fill="currentColor" className="text-amber-300" />
            {score}
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-200 transition group-hover:text-violet-300">
          {title}
        </h3>
        {anime.episodes != null && (
          <p className="mt-2 text-xs text-gray-500">
            {anime.episodes} episodes
          </p>
        )}
      </div>
    </Link>
  )
}

function EmptyState({ searching, onClear }) {
  if (searching) {
    return (
      <div className="rounded-3xl border border-white/[0.07] bg-[#11111b] px-5 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Search size={28} />
        </div>

        <h3 className="mt-5 text-xl font-bold">No matching anime</h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-400">
          Nothing in your vault matches that title. Try another search.
        </p>

        <button
          type="button"
          onClick={onClear}
          className="mt-5 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
        >
          Clear search
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-[#11111b] px-5 py-14 text-center sm:py-20">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
        <Library size={34} />
      </div>

      <h3 className="mt-6 text-2xl font-black">Your vault is empty</h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
        Every great anime collection starts somewhere. Explore the catalog and
        save the shows you want to remember.
      </p>

      <Link
        to="/explore"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
      >
        <Compass size={17} />
        Explore anime
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}

function RemoveConfirmation({ anime, onCancel, onConfirm, loading }) {
  if (!anime) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !loading) onCancel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#14141f] p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <Trash2 size={22} />
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="remove-title" className="mt-5 text-xl font-bold">
          Remove from your vault?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          Remove <span className="font-semibold text-white">{anime.anime_title}</span>{' '}
          from your saved collection? You can save it again later.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:opacity-40"
          >
            Keep anime
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            Remove
          </button>
        </div>
      </section>
    </div>
  )
}

export default function MyVault() {
  const user = useAuthStore((state) => state.user)

  const [savedAnime, setSavedAnime] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [removingAnime, setRemovingAnime] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  const loadVault = useCallback(async () => {
    if (!user?.id) {
      setSavedAnime([])
      setError('')
      setLoading(false)
      return
    }

    if (!supabase) {
      setError('Supabase is not configured. Check your environment variables.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('saved_anime')
        .select('id, anime_id, anime_title, anime_image, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setSavedAnime(data ?? [])
    } catch (err) {
      setError(err?.message || 'Could not load your vault. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadVault()
  }, [loadVault])

  useEffect(() => {
    let active = true

    async function loadSuggestions() {
      setSuggestionsLoading(true)

      try {
        const response = await getPopularAnime({ page: 1, perPage: 6 })
        const results = Array.isArray(response)
          ? response
          : response?.results || []

        if (active) setSuggestions(results.slice(0, 6))
      } catch {
        if (active) setSuggestions([])
      } finally {
        if (active) setSuggestionsLoading(false)
      }
    }

    loadSuggestions()

    return () => {
      active = false
    }
  }, [])

  const filteredAnime = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return savedAnime

    return savedAnime.filter((anime) =>
      (anime.anime_title || '').toLowerCase().includes(query)
    )
  }, [savedAnime, search])

  const totalSaved = savedAnime.length

  const handleRemove = useCallback(async () => {
    if (!removingAnime || !user?.id || !supabase) return

    const anime = removingAnime

    setRemovingId(anime.id)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('saved_anime')
        .delete()
        .eq('id', anime.id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      setSavedAnime((current) =>
        current.filter((item) => item.id !== anime.id)
      )

      setRemovingAnime(null)
    } catch (err) {
      setError(err?.message || 'Could not remove this anime. Please try again.')
    } finally {
      setRemovingId(null)
    }
  }, [removingAnime, user?.id])

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090f] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.13),transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-950/80 via-[#171329] to-[#10101a] p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200 sm:text-xs">
                <Sparkles size={14} />
                Your personal collection
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                My <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">Vault.</span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-gray-400 sm:text-base">
                Your anime universe, all in one place. Keep your favorites
                close and discover your next obsession.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
                >
                  <Compass size={16} />
                  Explore anime
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/trending"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.08]"
                >
                  <Sparkles size={16} />
                  Discover trending
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-64">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                <Bookmark size={19} className="text-violet-300" />
                <p className="mt-4 text-3xl font-black">{totalSaved}</p>
                <p className="mt-1 text-xs text-gray-400">Saved anime</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                <Heart size={19} className="text-pink-300" />
                <p className="mt-4 text-3xl font-black">
                  {totalSaved > 0 ? '♥' : '—'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Your favorites</p>
              </div>
            </div>
          </div>
        </section>

        {!user ? (
          <section className="rounded-3xl border border-white/[0.07] bg-[#11111b] px-5 py-16 text-center sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <ShieldCheck size={30} />
            </div>

            <h2 className="mt-5 text-2xl font-black">Your vault is waiting</h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
              Sign in to save anime, build your collection, and access your
              saved titles whenever you return.
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500"
            >
              Sign in to continue
              <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                    <Library size={14} />
                    Your collection
                  </div>

                  <h2 className="text-2xl font-black sm:text-3xl">
                    Your saved anime
                  </h2>

                  <p className="mt-2 text-sm text-gray-500" aria-live="polite">
                    {loading
                      ? 'Loading your collection...'
                      : `${filteredAnime.length} ${
                          filteredAnime.length === 1 ? 'title' : 'titles'
                        }${search.trim() ? ' found' : ' in your vault'}`}
                  </p>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />

                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search your collection..."
                      aria-label="Search saved anime"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#11111b] py-3 pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-400/40"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:text-white"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadVault}
                    disabled={loading}
                    aria-label="Refresh vault"
                    title="Refresh collection"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#11111b] text-gray-300 transition hover:border-violet-400/30 hover:text-violet-300 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={17}
                      className={loading ? 'animate-spin' : ''}
                    />
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-300" />
                  <p className="text-sm leading-6 text-red-200">{error}</p>
                </div>

                <button
                  type="button"
                  onClick={loadVault}
                  className="shrink-0 self-start text-sm font-semibold text-red-300 underline underline-offset-4 hover:text-red-200 sm:self-center"
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : filteredAnime.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredAnime.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onRemove={setRemovingAnime}
                    removing={removingId === anime.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                searching={Boolean(search.trim())}
                onClear={() => setSearch('')}
              />
            )}
          </>
        )}

        <section className="mt-14">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles size={14} />
                Handpicked for discovery
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                Popular anime
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Find your next favorite and add it to your collection.
              </p>
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-2 self-start text-sm font-semibold text-violet-300 transition hover:text-violet-200 sm:self-auto"
            >
              Explore all
              <ArrowRight size={16} />
            </Link>
          </div>

          {suggestionsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {suggestions.map((anime) => (
                <RecommendationCard key={anime.id} anime={anime} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#11111b] p-6 text-center">
              <p className="text-sm text-gray-400">
                Recommendations are temporarily unavailable.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-center text-xs text-gray-600 sm:flex-row sm:text-left">
          <span className="inline-flex items-center gap-2">
            <Sparkles size={14} className="text-violet-400" />
            Anime Vault · Your anime, your universe.
          </span>
          <span>Keep discovering. Keep collecting.</span>
        </footer>
      </div>

      <RemoveConfirmation
        anime={removingAnime}
        loading={Boolean(removingId)}
        onCancel={() => {
          if (!removingId) setRemovingAnime(null)
        }}
        onConfirm={handleRemove}
      />
    </main>
  )
}