import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Star,
  CalendarDays,
  Clock3,
  Clapperboard,
  Heart,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Users,
  Tv,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { getAnimeDetails, getAnimeRecommendations } from '../lib/jikan'
import { supabase } from '../lib/supabase'

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(1) : 'N/A'
}

function AnimePosterCard({ anime }) {
  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group block w-36 shrink-0 sm:w-40"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#191926]">
        {anime.image ? (
          <img
            src={anime.image}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <Clapperboard size={32} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {anime.score && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-bold text-amber-300">
            <Star size={12} fill="currentColor" />
            {formatScore(anime.score)}
          </span>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-gray-200 transition group-hover:text-violet-300">
        {anime.title}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {anime.year || anime.type || 'Anime'}
      </p>
    </Link>
  )
}

function DetailItem({ icon: Icon, label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-white/5 p-2 text-violet-300">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-gray-200">
          {Array.isArray(value) ? value.join(', ') : value}
        </p>
      </div>
    </div>
  )
}

export default function AnimeDetails() {
  const { id } = useParams()

  const [anime, setAnime] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)

  useEffect(() => {
    let active = true

    async function loadAnime() {
      setLoading(true)
      setError('')
      setAnime(null)
      setRecommendations([])
      setSynopsisExpanded(false)

      try {
        const animeId = Number(id)

        if (!id || !Number.isFinite(animeId) || animeId <= 0) {
          throw new Error('This anime link is invalid.')
        }

        const details = await getAnimeDetails(animeId)

        if (!details) {
          throw new Error('We could not find this anime.')
        }

        if (!active) return
        setAnime(details)

        try {
          const suggested = await getAnimeRecommendations(animeId)

          if (active) {
            setRecommendations(Array.isArray(suggested) ? suggested : [])
          }
        } catch {
          if (active) setRecommendations([])
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load anime details.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAnime()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    let active = true

    async function checkSavedStatus() {
      setUser(null)
      setSaved(false)

      if (!supabase) return

      const { data, error: authError } = await supabase.auth.getUser()

      if (!active || authError || !data?.user) return

      setUser(data.user)

      const { data: savedAnime, error: savedError } = await supabase
        .from('saved_anime')
        .select('anime_id')
        .eq('user_id', data.user.id)
        .eq('anime_id', String(id))
        .maybeSingle()

      if (active && !savedError) {
        setSaved(Boolean(savedAnime))
      }
    }

    checkSavedStatus()

    return () => {
      active = false
    }
  }, [id])

  async function toggleSaved() {
    if (!supabase || !user) {
      setNotice('Sign in to add anime to My Vault.')
      return
    }

    if (!anime || saving) return

    setSaving(true)
    setNotice('')

    try {
      if (saved) {
        const { error: deleteError } = await supabase
          .from('saved_anime')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_id', String(anime.id))

        if (deleteError) throw deleteError

        setSaved(false)
        setNotice('Removed from My Vault.')
      } else {
        const { error: insertError } = await supabase
          .from('saved_anime')
          .insert({
            user_id: user.id,
            anime_id: String(anime.id),
            anime_title: anime.title,
            anime_image: anime.image || null,
          })

        if (insertError) throw insertError

        setSaved(true)
        setNotice('Added to My Vault.')
      }
    } catch (err) {
      setNotice(err.message || 'Could not update My Vault. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6">
        <div className="h-64 rounded-3xl bg-white/5 sm:h-96" />
        <div className="mt-8 flex gap-6">
          <div className="h-56 w-40 shrink-0 rounded-2xl bg-white/5" />
          <div className="flex-1 space-y-4 pt-3">
            <div className="h-7 w-3/4 rounded bg-white/5" />
            <div className="h-4 w-1/3 rounded bg-white/5" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-5/6 rounded bg-white/5" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center">
        <div className="mb-4 rounded-2xl bg-red-500/10 p-4 text-red-300">
          <AlertCircle size={32} />
        </div>

        <h1 className="text-2xl font-bold text-white">Anime not found</h1>

        <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
          {error || 'This anime could not be loaded right now.'}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <RefreshCw size={16} />
            Try again
          </button>

          <Link
            to="/explore"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/5"
          >
            Explore anime
          </Link>
        </div>
      </div>
    )
  }

  const bannerImage = anime.banner || anime.image
  const synopsis = anime.synopsis || 'No synopsis is available for this anime yet.'
  const synopsisIsLong = synopsis.length > 450
  const visibleSynopsis =
    synopsisExpanded || !synopsisIsLong
      ? synopsis
      : `${synopsis.slice(0, 450).trimEnd()}...`

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <div className="relative h-[260px] overflow-hidden sm:h-[360px] lg:h-[440px]">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet-950 via-[#191926] to-[#09090f]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090f]/60 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090f]/75 via-transparent to-transparent" />

        <div className="absolute left-4 top-5 sm:left-8 sm:top-8">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/50"
          >
            <ArrowLeft size={16} />
            Back to Explore
          </Link>
        </div>

        <div className="absolute bottom-8 left-4 right-4 sm:bottom-10 sm:left-8 lg:left-12">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
            <Sparkles size={15} />
            Anime Vault Spotlight
          </p>

          <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-6xl">
            {anime.title}
          </h1>

          {anime.japaneseTitle && anime.japaneseTitle !== anime.title && (
            <p className="mt-3 max-w-3xl text-sm text-gray-300 sm:text-base">
              {anime.japaneseTitle}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative -mt-2 grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12121c] shadow-2xl shadow-black/30">
              {anime.image ? (
                <img
                  src={anime.image}
                  alt={anime.title}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-gray-600">
                  <Clapperboard size={40} />
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to={`/watch/${anime.id}`}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                <Play size={17} fill="currentColor" />
                Watch
              </Link>

              <button
                onClick={toggleSaved}
                disabled={saving}
                className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                  saved
                    ? 'border-violet-400/40 bg-violet-500/10 text-violet-200'
                    : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                {saving ? 'Saving...' : saved ? 'In My Vault' : 'Add to My Vault'}
              </button>
            </div>

            {notice && (
              <p role="status" className="mt-3 text-sm leading-5 text-violet-300">
                {notice}
                {notice.includes('Sign in') && (
                  <>
                    {' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#12121c] p-4">
              <h2 className="mb-4 text-sm font-bold text-white">Anime information</h2>

              <div className="space-y-4">
                <DetailItem
                  icon={Tv}
                  label="Format"
                  value={anime.type}
                />
                <DetailItem
                  icon={CalendarDays}
                  label="Year"
                  value={anime.year}
                />
                <DetailItem
                  icon={Clapperboard}
                  label="Episodes"
                  value={anime.episodes ? String(anime.episodes) : null}
                />
                <DetailItem
                  icon={Clock3}
                  label="Duration"
                  value={anime.duration}
                />
                <DetailItem
                  icon={Sparkles}
                  label="Status"
                  value={anime.status}
                />
                <DetailItem
                  icon={Users}
                  label="Studios"
                  value={anime.studios}
                />
              </div>
            </div>
          </aside>

          <main className="min-w-0 pt-5 md:pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3">
                <Star size={20} className="text-amber-300" fill="currentColor" />
                <div>
                  <p className="text-lg font-black text-white">
                    {formatScore(anime.score)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    User score
                  </p>
                </div>
              </div>

              {anime.rank && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-lg font-black text-white">#{anime.rank}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Ranking
                  </p>
                </div>
              )}

              {anime.popularity && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-lg font-black text-white">#{anime.popularity}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Popularity
                  </p>
                </div>
              )}
            </div>

            {anime.genres?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {anime.genres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/explore?genre=${encodeURIComponent(genre)}`}
                    className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/20"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            <section className="mt-8">
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Synopsis
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-400 sm:text-base sm:leading-8">
                {visibleSynopsis}
              </p>

              {synopsisIsLong && (
                <button
                  onClick={() => setSynopsisExpanded((current) => !current)}
                  className="mt-3 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
                >
                  {synopsisExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </section>

            <section className="mt-9 rounded-2xl border border-white/10 bg-[#12121c] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
                  <Heart size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-white">Make it part of your vault</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Keep track of the anime you want to explore.
                  </p>
                </div>
              </div>

              <button
                onClick={toggleSaved}
                disabled={saving}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                {saving ? 'Saving...' : saved ? 'Saved to My Vault' : 'Save this anime'}
              </button>
            </section>

            {recommendations.length > 0 && (
              <section className="mt-10">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                      Keep exploring
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                      You might also like
                    </h2>
                  </div>

                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-gray-400 transition hover:text-white"
                  >
                    View all
                    <ChevronRight size={16} />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4">
                  {recommendations.slice(0, 8).map((item) => (
                    <AnimePosterCard key={item.id} anime={item} />
                  ))}
                </div>
              </section>
            )}

            {anime.url && (
              <a
                href={anime.url}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-violet-300"
              >
                View source details
                <ExternalLink size={14} />
              </a>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
