import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search as SearchIcon,
  X,
  Star,
  Clock3,
  Clapperboard,
  TrendingUp,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Flame,
  CalendarDays,
  Compass,
  Play,
} from 'lucide-react'
import {
  searchAnime,
  getPopularAnime,
  getTrendingAnime,
} from '../lib/jikan'

const popularSearches = [
  'Naruto',
  'One Piece',
  'Jujutsu Kaisen',
  'Demon Slayer',
  'Attack on Titan',
  'Spy x Family',
]

const sortOptions = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Highest rated', value: 'score' },
  { label: 'Most popular', value: 'popularity' },
  { label: 'Trending', value: 'trending' },
]

function getAnimeScore(anime) {
  const score = anime?.score

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null
  }

  return score > 10 ? score / 10 : score
}

function formatScore(score) {
  const normalized = getAnimeScore({ score })
  return normalized === null ? 'N/A' : normalized.toFixed(1)
}

function getYear(anime) {
  if (anime.year) return anime.year

  const date = anime.startDate

  if (date?.year) return date.year

  if (typeof anime.startDate === 'string') {
    const match = anime.startDate.match(/\d{4}/)
    if (match) return match[0]
  }

  return null
}

function getStatus(status) {
  const labels = {
    FINISHED: 'Finished',
    RELEASING: 'Airing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'On hiatus',
  }

  return labels[status] || status || null
}

function getResults(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.data)) return response.data

  return []
}

function AnimeResultCard({ anime, index }) {
  const score = getAnimeScore(anime)
  const year = getYear(anime)
  const status = getStatus(anime.status)
  const title = anime.title || anime.titleEnglish || 'Untitled Anime'
  const image = anime.image || anime.coverImage?.large || anime.coverImage?.extraLarge

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group relative flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11111b] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-[#171725] hover:shadow-xl hover:shadow-violet-950/10 sm:gap-5 sm:p-4"
      style={{ animationDelay: `${Math.min(index * 45, 350)}ms` }}
    >
      <div className="relative w-24 shrink-0 overflow-hidden rounded-xl bg-[#1a1a29] sm:w-32">
        <div className="aspect-[2/3]">
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Clapperboard size={28} />
            </div>
          )}
        </div>

        {score !== null && (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-xs font-bold text-white backdrop-blur">
            <Star size={12} fill="currentColor" className="text-amber-300" />
            {score.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className="flex flex-wrap items-center gap-2">
          {anime.type && (
            <span className="rounded-md border border-violet-400/15 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
              {anime.type}
            </span>
          )}

          {year && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <CalendarDays size={12} />
              {year}
            </span>
          )}
        </div>

        <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-white transition group-hover:text-violet-300 sm:text-lg">
          {title}
        </h2>

        {anime.titleRomaji && anime.titleRomaji !== title && (
          <p className="mt-1 line-clamp-1 text-xs text-gray-500">
            {anime.titleRomaji}
          </p>
        )}

        <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
          {anime.synopsis ||
            anime.description ||
            'Discover the story, characters, and details of this anime.'}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-xs text-gray-400">
          {anime.episodes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clapperboard size={14} />
              {anime.episodes} eps
            </span>
          )}

          {status && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {status}
            </span>
          )}
        </div>

        {anime.genres?.length > 0 && (
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {anime.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10px] text-gray-400"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-center text-gray-600 transition group-hover:text-violet-300 sm:flex">
        <ArrowRight size={18} />
      </div>
    </Link>
  )
}

function SearchSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Loading anime results" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex gap-4 rounded-2xl border border-white/[0.05] bg-[#11111b] p-4"
        >
          <div className="aspect-[2/3] w-24 shrink-0 animate-pulse rounded-xl bg-white/[0.06] sm:w-32" />

          <div className="flex-1 space-y-3 py-2">
            <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const inputRef = useRef(null)
  const requestIdRef = useRef(0)

  const initialQuery = searchParams.get('q') || ''
  const initialPage = Math.max(1, Number(searchParams.get('page')) || 1)

  const [inputValue, setInputValue] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [anime, setAnime] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(initialPage)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const loadResults = useCallback(async (searchTerm, pageNumber, sortBy) => {
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError('')

    try {
      const options = {
        page: pageNumber,
        perPage: 20,
      }

      let response

      if (searchTerm.trim()) {
        response = await searchAnime(searchTerm.trim(), options)
      } else if (sortBy === 'trending') {
        response = await getTrendingAnime(options)
      } else {
        response = await getPopularAnime(options)
      }

      if (requestId !== requestIdRef.current) return

      const results = getResults(response)
      const pageInfo = response?.pageInfo

      let sortedResults = [...results]

      if (sortBy === 'score') {
        sortedResults.sort((a, b) => {
          return (getAnimeScore(b) || 0) - (getAnimeScore(a) || 0)
        })
      }

      if (sortBy === 'popularity') {
        sortedResults.sort((a, b) => {
          return (a.popularity || 0) - (b.popularity || 0)
        })
      }

      setAnime(sortedResults)
      setHasNextPage(
        typeof pageInfo?.hasNextPage === 'boolean'
          ? pageInfo.hasNextPage
          : results.length >= options.perPage,
      )
    } catch (err) {
      if (requestId !== requestIdRef.current) return

      setAnime([])
      setHasNextPage(false)
      setError(err?.message || 'Something went wrong while searching.')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = inputValue.trim()

      if (nextQuery !== query) {
        setQuery(nextQuery)
        setPage(1)

        const nextParams = new URLSearchParams(searchParams)

        if (nextQuery) {
          nextParams.set('q', nextQuery)
        } else {
          nextParams.delete('q')
        }

        nextParams.delete('page')
        setSearchParams(nextParams, { replace: true })
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [inputValue, query, searchParams, setSearchParams])

  useEffect(() => {
    loadResults(query, page, sort)
  }, [query, page, sort, loadResults])

  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlPage = Math.max(1, Number(searchParams.get('page')) || 1)

    if (urlQuery !== query) {
      setInputValue(urlQuery)
      setQuery(urlQuery)
    }

    if (urlPage !== page) {
      setPage(urlPage)
    }
  }, [searchParams, query, page])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
    }
  }, [])

  function updateUrl(nextQuery, nextPage = 1) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextQuery.trim()) {
      nextParams.set('q', nextQuery.trim())
    } else {
      nextParams.delete('q')
    }

    if (nextPage > 1) {
      nextParams.set('page', String(nextPage))
    } else {
      nextParams.delete('page')
    }

    setSearchParams(nextParams, { replace: true })
  }

  function submitSearch(event) {
    event.preventDefault()

    const nextQuery = inputValue.trim()

    setQuery(nextQuery)
    setPage(1)
    updateUrl(nextQuery)
    inputRef.current?.blur()
  }

  function choosePopularSearch(term) {
    setInputValue(term)
    setQuery(term)
    setPage(1)
    updateUrl(term)
  }

  function clearSearch() {
    setInputValue('')
    setQuery('')
    setPage(1)
    updateUrl('')
    inputRef.current?.focus()
  }

  function changePage(nextPage) {
    if (nextPage < 1) return

    setPage(nextPage)
    updateUrl(query, nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090f] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-3 py-1.5 text-violet-300">
            <Sparkles size={15} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Anime Vault
            </span>
          </div>

          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Your next favorite anime
            <span className="mt-1 block bg-gradient-to-r from-violet-300 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              is waiting to be discovered.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
            Search the anime catalog, discover new stories, and find your next
            series to add to your watchlist.
          </p>
        </header>

        <form onSubmit={submitSearch} className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#12121c]/95 p-2 shadow-2xl shadow-black/20 transition focus-within:border-violet-400/50 focus-within:shadow-violet-950/10 sm:gap-3">
            <SearchIcon size={21} className="ml-2 shrink-0 text-violet-300 sm:ml-3" />

            <input
              ref={inputRef}
              type="search"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search anime titles..."
              aria-label="Search anime titles"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-500 sm:text-base"
            />

            {inputValue && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            )}

            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 active:scale-[0.98] sm:px-6"
            >
              Search
            </button>
          </div>
        </form>

        {!query && (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
              <TrendingUp size={16} className="text-violet-300" />
              Popular searches
            </div>

            <div className="flex flex-wrap gap-2">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => choosePopularSearch(term)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-gray-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-200 sm:text-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">
                {query ? (
                  <SearchIcon size={14} />
                ) : sort === 'trending' ? (
                  <Flame size={14} />
                ) : (
                  <Sparkles size={14} />
                )}

                {query ? 'Search results' : sort === 'trending' ? 'Trending now' : 'Discover'}
              </div>

              <h2 className="text-xl font-bold text-white sm:text-2xl">
                {query ? (
                  <>
                    Results for <span className="text-violet-300">"{query}"</span>
                  </>
                ) : sort === 'trending' ? (
                  'Anime everyone is watching'
                ) : (
                  'Popular anime'
                )}
              </h2>

              <p className="mt-1.5 text-xs text-gray-500 sm:text-sm" aria-live="polite">
                {loading
                  ? 'Finding anime for you...'
                  : `${anime.length} anime on this page`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                filtersOpen
                  ? 'border-violet-400/30 bg-violet-500/10 text-violet-200'
                  : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal size={16} />
              Sort
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#11111b] p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <label
                  htmlFor="search-sort"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Sort and discover
                </label>

                <select
                  id="search-sort"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value)
                    setPage(1)
                    updateUrl(query)
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="max-w-sm text-xs leading-5 text-gray-500">
                Sorting applies to the results returned by the current API page.
                Use Trending to discover currently popular anime.
              </p>
            </div>
          )}
        </section>

        <div className="mt-5">
          {loading ? (
            <SearchSkeleton />
          ) : error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.04] px-5 py-12 text-center">
              <AlertCircle size={30} className="mx-auto text-red-300" />

              <h3 className="mt-4 text-lg font-bold text-white">
                We couldn't load the anime
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadResults(query, page, sort)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </div>
          ) : anime.length > 0 ? (
            <div className="grid gap-3 sm:gap-4">
              {anime.map((item, index) => (
                <AnimeResultCard key={item.id} anime={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#11111b] px-5 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
                <SearchX size={30} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-white">
                No anime found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Try another title or check your spelling. You can also explore
                trending anime to discover something new.
              </p>

              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Browse popular anime
              </button>
            </div>
          )}
        </div>

        {!loading && !error && anime.length > 0 && (
          <nav
            aria-label="Search result pages"
            className="mt-8 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span className="text-sm text-gray-400">
              Page <span className="font-bold text-white">{page}</span>
            </span>

            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
              <ChevronRight size={17} />
            </button>
          </nav>
        )}

        <section className="mt-12 overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] via-[#11111b] to-fuchsia-500/[0.04] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300 sm:flex">
                <Compass size={23} />
              </div>

              <div>
                <h2 className="font-bold text-white sm:text-lg">
                  Your next adventure starts here
                </h2>

                <p className="mt-1 max-w-lg text-sm leading-6 text-gray-400">
                  Explore the catalog, discover new genres, and build your
                  personal anime collection.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.08]"
              >
                Explore anime
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/trending"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <Play size={15} />
                Trending anime
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-5 text-center text-xs text-gray-600 sm:flex-row sm:text-left">
          <span>Anime Vault · Discover your next favorite</span>
          <span>Anime information powered by AniList</span>
        </footer>
      </div>
    </main>
  )
}