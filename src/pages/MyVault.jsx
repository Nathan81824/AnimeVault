
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
  Clapperboard,
  Clock3,
  Compass,
  ArrowRight,
  ShieldCheck,
  Film,
  AlertCircle,
  CalendarClock,
  Video,
  Upload,
  Calendar,
  Send,
  Ban,
  FolderPlus,
  ListVideo,
  X,
  Plus,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'
import { getPopularAnime } from '../lib/jikan'
import shortService from '../features/shorts/services/shortsService'

function formatDate(date) {
  if (!date) return 'Not scheduled'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return 'Invalid date'

  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getMinimumDateTime() {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 1)

  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60000)

  return localDate.toISOString().slice(0, 16)
}

function getItems(result, keys = []) {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key]
  }

  if (result?.data && result.data !== result) {
    return getItems(result.data, keys)
  }

  return []
}

function getShortRecord(item) {
  return item?.short || item?.shorts || item
}

function getShortRecordId(item) {
  const short = getShortRecord(item)

  return item?.short_id || short?.id || item?.id
}

function getYouTubeVideoId(url) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null
    }

    if (
      ['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)
    ) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }

      const parts = parsed.pathname.split('/').filter(Boolean)

      if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
        return parts[1] || null
      }
    }

    return null
  } catch {
    return null
  }
}

function getYouTubeEmbedUrl(url) {
  const id = getYouTubeVideoId(url)

  if (!id) return null

  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`
}

function normalizeAnime(item) {
  const anime = item.anime || item

  return {
    ...anime,
    id: item.id || anime.id || item.anime_id,
    anime_id: item.anime_id || anime.anime_id || anime.mal_id || anime.id,
    anime_title:
      item.anime_title ||
      item.title ||
      anime.anime_title ||
      anime.title ||
      anime.title_english ||
      'Untitled Anime',
    anime_image:
      item.anime_image ||
      item.image ||
      anime.anime_image ||
      anime.image ||
      anime.images?.jpg?.large_image_url ||
      anime.images?.jpg?.image_url ||
      '',
    anime_status: item.anime_status || anime.anime_status || anime.status || '',
    anime_episodes:
      item.anime_episodes ?? anime.anime_episodes ?? anime.episodes ?? null,
  }
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-orange-500/10 bg-[#17100b]">
      <div className="aspect-[3/4] animate-pulse bg-orange-500/[0.06]" />
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
  const animeId = anime.anime_id || anime.id

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-orange-500/10 bg-[#17100b] transition duration-300 hover:-translate-y-1 hover:border-orange-400/40">
      <Link
        to={`/anime/${animeId}`}
        aria-label={`View ${title}`}
        className="relative block aspect-[3/4] overflow-hidden bg-[#21160e]"
      >
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-orange-400">
            <Library size={42} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-300">
            {anime.anime_episodes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clapperboard size={13} />
                {anime.anime_episodes} eps
              </span>
            )}

            {anime.anime_status && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {anime.anime_status}
              </span>
            )}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-xl bg-orange-500 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <Play size={16} fill="currentColor" />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-orange-500/10 px-3 py-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-orange-300">
          <Bookmark size={13} fill="currentColor" />
          <span className="truncate">Saved anime</span>
        </span>

        <button
          type="button"
          onClick={() => onRemove(anime)}
          disabled={removing}
          aria-label={`Remove ${title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
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
  const title =
    anime.title_english ||
    anime.title ||
    anime.titleEnglish ||
    'Untitled Anime'

  const image =
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.image ||
    anime.coverImage?.large

  const animeId = anime.mal_id || anime.id

  return (
    <Link
      to={`/anime/${animeId}`}
      className="group overflow-hidden rounded-2xl border border-orange-500/10 bg-[#17100b] transition hover:-translate-y-1 hover:border-orange-400/40"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#21160e]">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-orange-400">
            <Film size={30} />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-200 group-hover:text-orange-300">
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

function ShortPlayer({ url, title }) {
  const youtubeEmbed = getYouTubeEmbedUrl(url)

  if (youtubeEmbed) {
    return (
      <iframe
        src={youtubeEmbed}
        title={title || 'YouTube Short'}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    )
  }

  if (url) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full object-contain"
      />
    )
  }

  return (
    <div className="flex h-full items-center justify-center text-gray-600">
      <Video size={40} />
    </div>
  )
}

function ShortCard({
  short,
  scheduled = false,
  busy,
  onPublish,
  onDelete,
  onSchedule,
  onCancelSchedule,
}) {
  const [scheduleValue, setScheduleValue] = useState('')
  const [showScheduler, setShowScheduler] = useState(false)

  const videoUrl =
    short.videoUrl ||
    short.video_url ||
    short.youtubeUrl ||
    short.youtube_url

  const title = short.title || 'Untitled Short'
  const scheduledAt = short.scheduledAt || short.scheduled_at

  const handleSchedule = async (event) => {
    event.preventDefault()

    if (!scheduleValue) return

    const date = new Date(scheduleValue)

    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      return
    }

    await onSchedule(short.id, date.toISOString())
    setScheduleValue('')
    setShowScheduler(false)
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-500/10 bg-[#17100b] transition hover:border-orange-400/30">
      <div className="relative aspect-video bg-black">
        <ShortPlayer url={videoUrl} title={title} />

        <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-200">
          {scheduled ? 'Scheduled' : 'Draft'}
        </span>
      </div>

      <div className="p-4">
        <h3 className="truncate font-bold text-white">{title}</h3>

        {short.caption && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {short.caption}
          </p>
        )}

        <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Clock3 size={14} />
          {scheduled
            ? `Publishes ${formatDate(scheduledAt)}`
            : `Created ${formatDate(short.createdAt || short.created_at)}`}
        </p>

        {scheduled ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCancelSchedule(short.id)}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
            >
              {busy ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Ban size={14} />
              )}
              Cancel schedule
            </button>

            <button
              type="button"
              onClick={() => onDelete(short.id)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onPublish(short.id)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {busy ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Publish now
              </button>

              <button
                type="button"
                onClick={() => setShowScheduler((current) => !current)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2.5 text-xs font-bold text-orange-200 hover:bg-orange-400/20 disabled:opacity-50"
              >
                <CalendarClock size={14} />
                Schedule
              </button>

              <button
                type="button"
                onClick={() => onDelete(short.id)}
                disabled={busy}
                aria-label="Delete draft"
                className="inline-flex items-center justify-center rounded-xl border border-red-500/20 px-3 py-2.5 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {showScheduler && (
              <form
                onSubmit={handleSchedule}
                className="mt-4 rounded-xl border border-orange-500/10 bg-black/20 p-3"
              >
                <label className="mb-2 block text-xs font-semibold text-gray-300">
                  Choose publication date and time
                </label>

                <input
                  type="datetime-local"
                  value={scheduleValue}
                  min={getMinimumDateTime()}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#09090f] px-3 py-3 text-sm text-white outline-none focus:border-orange-400/50"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy || !scheduleValue}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-400 disabled:opacity-50"
                  >
                    <Send size={13} />
                    Confirm schedule
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScheduler(false)}
                    className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function SectionEmpty({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-500/20 bg-[#17100b] px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
        <Icon size={25} />
      </div>

      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        {description}
      </p>

      {action}
    </div>
  )
}

const tabs = [
  { id: 'drafts', label: 'Drafts', icon: Video },
  { id: 'trailers', label: 'Saved Anime', icon: Bookmark },
  { id: 'playlists', label: 'Playlists', icon: ListVideo },
]

export default function MyVault() {
  const user = useAuthStore((state) => state.user)

  const [activeTab, setActiveTab] = useState('trailers')

  const [savedAnime, setSavedAnime] = useState([])
  const [myShorts, setMyShorts] = useState([])
  const [savedShorts, setSavedShorts] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [playlistShorts, setPlaylistShorts] = useState([])
  const [playlistSavedShorts, setPlaylistSavedShorts] = useState([])
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [suggestions, setSuggestions] = useState([])

  const [loading, setLoading] = useState(true)
  const [shortsLoading, setShortsLoading] = useState(true)
  const [savedShortsLoading, setSavedShortsLoading] = useState(true)
  const [playlistsLoading, setPlaylistsLoading] = useState(true)
  const [playlistShortsLoading, setPlaylistShortsLoading] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  const [error, setError] = useState('')
  const [shortsError, setShortsError] = useState('')
  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')
  const [removingAnime, setRemovingAnime] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [busyShortId, setBusyShortId] = useState(null)

  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)

  const loadVault = useCallback(async () => {
    if (!user?.id || !supabase) {
      setSavedAnime([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('saved_anime')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setSavedAnime((data || []).map(normalizeAnime))
    } catch (err) {
      setError(err?.message || 'Could not load your saved anime.')
      setSavedAnime([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const loadShorts = useCallback(async () => {
    if (!user?.id) {
      setMyShorts([])
      setShortsLoading(false)
      return
    }

    setShortsLoading(true)
    setShortsError('')

    try {
      const result = await shortService.getMyShorts()

      if (!result?.success) {
        throw new Error(result?.error || 'Could not load your Shorts.')
      }

      setMyShorts(result.shorts || [])
    } catch (err) {
      setShortsError(err?.message || 'Could not load your Shorts.')
    } finally {
      setShortsLoading(false)
    }
  }, [user?.id])

  const loadSavedShorts = useCallback(async () => {
    if (!user?.id) {
      setSavedShorts([])
      setSavedShortsLoading(false)
      return
    }

    setSavedShortsLoading(true)

    try {
      const result = await shortService.getSavedShorts()

      if (result?.success === false) {
        throw new Error(result.error || 'Could not load saved Shorts.')
      }

      setSavedShorts(getItems(result, ['shorts', 'savedShorts', 'data']))
    } catch (err) {
      setShortsError(err?.message || 'Could not load saved Shorts.')
    } finally {
      setSavedShortsLoading(false)
    }
  }, [user?.id])

  const loadPlaylists = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([])
      setPlaylistSavedShorts([])
      setPlaylistsLoading(false)
      return
    }

    setPlaylistsLoading(true)

    try {
      const result = await shortService.getMyPlaylists()

      if (result?.success === false) {
        throw new Error(result.error || 'Could not load playlists.')
      }

      const loadedPlaylists = getItems(result, ['playlists', 'data'])

      setPlaylists(loadedPlaylists)

      const playlistResults = await Promise.all(
        loadedPlaylists.map(async (playlist) => {
          try {
            const playlistResult = await shortService.getPlaylistShorts(
              playlist.id,
            )

            if (playlistResult?.success === false) return []

            return getItems(playlistResult, [
              'shorts',
              'playlistShorts',
              'data',
            ]).map((short) => ({
              ...short,
              __playlistId: playlist.id,
              __playlistName: playlist.name,
            }))
          } catch {
            return []
          }
        }),
      )

      setPlaylistSavedShorts(playlistResults.flat())
    } catch (err) {
      setShortsError(err?.message || 'Could not load playlists.')
      setPlaylists([])
      setPlaylistSavedShorts([])
    } finally {
      setPlaylistsLoading(false)
    }
  }, [user?.id])

  const loadPlaylistShorts = useCallback(async (playlist) => {
    if (!playlist?.id) return

    setActivePlaylist(playlist)
    setPlaylistShorts([])
    setPlaylistShortsLoading(true)

    try {
      const result = await shortService.getPlaylistShorts(playlist.id)

      if (result?.success === false) {
        throw new Error(result.error || 'Could not load this playlist.')
      }

      setPlaylistShorts(
        getItems(result, ['shorts', 'playlistShorts', 'data']),
      )
    } catch (err) {
      setShortsError(err?.message || 'Could not load playlist Shorts.')
    } finally {
      setPlaylistShortsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVault()
    loadShorts()
    loadSavedShorts()
    loadPlaylists()
  }, [loadVault, loadShorts, loadSavedShorts, loadPlaylists])

  useEffect(() => {
    let active = true

    async function loadSuggestions() {
      setSuggestionsLoading(true)

      try {
        const response = await getPopularAnime({ page: 1, perPage: 6 })
        const results = Array.isArray(response)
          ? response
          : response?.results || response?.data || []

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
      (anime.anime_title || '').toLowerCase().includes(query),
    )
  }, [savedAnime, search])

  const drafts = useMemo(
    () =>
      myShorts.filter(
        (short) =>
          short.status === 'draft' &&
          !(short.scheduledAt || short.scheduled_at),
      ),
    [myShorts],
  )

  const scheduledShorts = useMemo(
    () =>
      myShorts.filter(
        (short) =>
          short.status === 'draft' &&
          Boolean(short.scheduledAt || short.scheduled_at),
      ),
    [myShorts],
  )

  const totalDraftVideos = drafts.length + scheduledShorts.length
  const playlistCount = playlists.length

  const combinedSavedShorts = useMemo(() => {
    const unique = new Map()

    savedShorts.forEach((item) => {
      const id = getShortRecordId(item)

      if (!id) return

      unique.set(String(id), {
        ...item,
        __isSaved: true,
        __playlistIds: [],
      })
    })

    playlistSavedShorts.forEach((item) => {
      const id = getShortRecordId(item)

      if (!id) return

      const key = String(id)
      const existing = unique.get(key)

      if (existing) {
        const playlistIds = existing.__playlistIds || []

        if (!playlistIds.includes(item.__playlistId)) {
          existing.__playlistIds = [
            ...playlistIds,
            item.__playlistId,
          ]
        }

        unique.set(key, existing)
      } else {
        unique.set(key, {
          ...item,
          __isSaved: false,
          __playlistIds: [item.__playlistId],
        })
      }
    })

    return Array.from(unique.values())
  }, [savedShorts, playlistSavedShorts])

  const savedShortsCount = combinedSavedShorts.length

  const handleRemoveAnime = useCallback(async () => {
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
        current.filter((item) => item.id !== anime.id),
      )

      setRemovingAnime(null)
    } catch (err) {
      setError(err?.message || 'Could not remove this anime.')
    } finally {
      setRemovingId(null)
    }
  }, [removingAnime, user?.id])

  const handleShortAction = useCallback(
    async (id, action, ...args) => {
      setBusyShortId(id)
      setShortsError('')
      setNotice('')

      try {
        const serviceAction = shortService[action]

        if (typeof serviceAction !== 'function') {
          throw new Error(`The Shorts service does not support ${action}.`)
        }

        const result = await serviceAction(id, ...args)

        if (!result?.success) {
          throw new Error(result?.error || 'Short action failed.')
        }

        const messages = {
          publishShort: 'Your Short has been published.',
          scheduleShort: 'Your Short has been scheduled.',
          cancelShortSchedule: 'The publication schedule has been cancelled.',
          deleteShort: 'Your Short has been deleted.',
        }

        setNotice(messages[action] || 'Your Short has been updated.')
        await loadShorts()
      } catch (err) {
        setShortsError(err?.message || 'Could not complete this action.')
      } finally {
        setBusyShortId(null)
      }
    },
    [loadShorts],
  )

  const handleCreatePlaylist = async (event) => {
    event.preventDefault()

    if (!playlistName.trim()) return

    setCreatingPlaylist(true)
    setShortsError('')
    setNotice('')

    try {
      const result = await shortService.createPlaylist(
        playlistName.trim(),
        playlistDescription.trim(),
      )

      if (!result?.success) {
        throw new Error(result?.error || 'Could not create playlist.')
      }

      setPlaylistName('')
      setPlaylistDescription('')
      setShowCreatePlaylist(false)
      setNotice('Your playlist has been created.')
      await loadPlaylists()
    } catch (err) {
      setShortsError(err?.message || 'Could not create playlist.')
    } finally {
      setCreatingPlaylist(false)
    }
  }

  const handleRemoveSavedShort = async (shortId) => {
    if (!shortId) return

    setBusyShortId(shortId)
    setShortsError('')

    try {
      const result = await shortService.unsaveShort(shortId)

      if (!result?.success) {
        throw new Error(result?.error || 'Could not remove saved Short.')
      }

      setNotice('Short removed from your saved collection.')

      await Promise.all([loadSavedShorts(), loadPlaylists()])
    } catch (err) {
      setShortsError(err?.message || 'Could not remove saved Short.')
    } finally {
      setBusyShortId(null)
    }
  }

  const handleRemoveFromPlaylistById = async (playlistId, shortId) => {
    if (!playlistId || !shortId) return

    setBusyShortId(shortId)
    setShortsError('')

    try {
      const result = await shortService.removeShortFromPlaylist(
        playlistId,
        shortId,
      )

      if (!result?.success) {
        throw new Error(result?.error || 'Could not remove Short.')
      }

      if (activePlaylist?.id === playlistId) {
        await loadPlaylistShorts(activePlaylist)
      }

      await loadPlaylists()

      setNotice('Short removed from playlist.')
    } catch (err) {
      setShortsError(err?.message || 'Could not remove Short.')
    } finally {
      setBusyShortId(null)
    }
  }

  const handleRemoveFromPlaylist = async (shortId) => {
    if (!activePlaylist?.id) return

    await handleRemoveFromPlaylistById(activePlaylist.id, shortId)
  }

  const refreshAll = () => {
    setNotice('')
    setShortsError('')
    loadVault()
    loadShorts()
    loadSavedShorts()
    loadPlaylists()
  }

  const renderSavedShort = (item, index, inPlaylist = false) => {
    const short = getShortRecord(item)
    const shortId = getShortRecordId(item)

    const videoUrl =
      short.video_url ||
      short.videoUrl ||
      short.youtube_url ||
      short.youtubeUrl

    const isSaved = item.__isSaved !== false

    const handleRemove = () => {
      if (inPlaylist) {
        handleRemoveFromPlaylist(shortId)
      } else if (isSaved) {
        handleRemoveSavedShort(shortId)
      } else {
        const playlistId =
          item.__playlistIds?.[0] || item.__playlistId

        handleRemoveFromPlaylistById(playlistId, shortId)
      }
    }

    return (
      <article
        key={`${shortId || index}-${inPlaylist ? 'playlist' : 'saved'}`}
        className="overflow-hidden rounded-2xl border border-orange-500/10 bg-[#17100b] transition hover:border-orange-400/30"
      >
        <div className="relative aspect-video bg-black">
          <ShortPlayer
            url={videoUrl}
            title={short.title || 'Saved Short'}
          />
        </div>

        <div className="p-4">
          <h3 className="truncate font-bold text-white">
            {short.title || 'Untitled Short'}
          </h3>

          {short.caption && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-400">
              {short.caption}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-orange-300">
              {inPlaylist
                ? activePlaylist?.name || 'Playlist Short'
                : isSaved
                  ? 'Saved Short'
                  : 'Saved through playlist'}
            </span>

            <button
              type="button"
              onClick={handleRemove}
              disabled={busyShortId === shortId}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {busyShortId === shortId ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Remove
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#100a05] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.18),transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-orange-400/25 bg-gradient-to-br from-[#9a3412] via-[#6b2b0d] to-[#211008] p-6 shadow-2xl shadow-orange-950/30 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
            <div className="absolute -right-10 top-[-100px] h-80 w-80 rotate-45 border border-white/70" />
            <div className="absolute right-32 top-[-120px] h-80 w-80 rotate-45 border border-white/60" />
            <div className="absolute bottom-[-180px] left-1/3 h-80 w-80 rotate-45 border border-white/60" />
          </div>

          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200/30 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100 sm:text-xs">
                <Sparkles size={14} />
                Your personal collection
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                My{' '}
                <span className="bg-gradient-to-r from-orange-200 via-amber-200 to-yellow-100 bg-clip-text text-transparent">
                  Vault.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-orange-50/80 sm:text-base">
                Your anime collection, saved Shorts, playlists and creator
                workspace, all in one place.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-[#261106] shadow-lg transition hover:bg-orange-300"
                >
                  <Compass size={16} />
                  Explore anime
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/30"
                >
                  <Upload size={16} />
                  Upload a Short
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-72">
              <div className="rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur-sm">
                <Bookmark size={19} className="text-orange-200" />
                <p className="mt-4 text-3xl font-black tabular-nums">
                  {savedShortsCount}
                </p>
                <p className="mt-1 text-xs text-orange-100/70">
                  Saved Shorts
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur-sm">
                <Video size={19} className="text-amber-200" />
                <p className="mt-4 text-3xl font-black tabular-nums">
                  {myShorts.length}
                </p>
                <p className="mt-1 text-xs text-orange-100/70">
                  Your Shorts
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Library size={19} className="text-orange-200" />
                  <div>
                    <p className="text-2xl font-black tabular-nums">
                      {savedAnime.length}
                    </p>
                    <p className="text-xs text-orange-100/70">
                      Saved Anime
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!user ? (
          <section className="rounded-3xl border border-orange-500/10 bg-[#17100b] px-5 py-16 text-center">
            <ShieldCheck size={30} className="mx-auto text-orange-300" />
            <h2 className="mt-5 text-2xl font-black">Your vault is waiting</h2>
            <p className="mt-3 text-sm text-gray-400">
              Sign in to save anime, build playlists and manage your Shorts.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold hover:bg-orange-400"
            >
              Sign in to continue
              <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-7">
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                  <Library size={14} />
                  Your collection
                </div>
                <h2 className="text-2xl font-black sm:text-3xl">
                  Your Library
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a section to view and manage its content.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 rounded-2xl border border-orange-500/10 bg-[#17100b] p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id

                  const count =
                    tab.id === 'drafts'
                      ? totalDraftVideos
                      : tab.id === 'trailers'
                        ? savedAnime.length
                        : playlistCount

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id)
                        setActivePlaylist(null)
                        setPlaylistShorts([])
                        setSearch('')
                        setNotice('')
                      }}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition sm:flex-none ${
                        active
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/30'
                          : 'text-gray-400 hover:bg-orange-500/10 hover:text-white'
                      }`}
                    >
                      <Icon size={17} />
                      {tab.label}
                      <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs">
                        {count}
                      </span>
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={refreshAll}
                  disabled={loading || shortsLoading}
                  title="Refresh vault"
                  className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/10 text-gray-300 hover:border-orange-400/30 hover:text-orange-300 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={
                      loading || shortsLoading ? 'animate-spin' : ''
                    }
                  />
                </button>
              </div>
            </section>

            {notice && (
              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
                {notice}
              </div>
            )}

            {(error || shortsError) && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4"
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-300"
                />
                <p className="text-sm leading-6 text-red-200">
                  {error || shortsError}
                </p>
              </div>
            )}

            {activeTab === 'trailers' && (
              <section>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Saved Anime</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Anime you have bookmarked for later.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search saved anime..."
                      className="w-full rounded-xl border border-orange-500/10 bg-[#17100b] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-orange-400/40"
                    />
                  </div>
                </div>

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
                        key={anime.id || anime.anime_id}
                        anime={anime}
                        onRemove={setRemovingAnime}
                        removing={removingId === anime.id}
                      />
                    ))}
                  </div>
                ) : (
                  <SectionEmpty
                    icon={Bookmark}
                    title={
                      search ? 'No matching anime' : 'No saved anime yet'
                    }
                    description={
                      search
                        ? 'Try another search term.'
                        : 'Explore anime and save the ones you want to watch later.'
                    }
                    action={
                      <Link
                        to="/explore"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400"
                      >
                        <Compass size={16} />
                        Explore anime
                      </Link>
                    }
                  />
                )}
              </section>
            )}

            {activeTab === 'drafts' && (
              <section>
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-2xl font-black">Your Drafts</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Manage your unpublished and scheduled Shorts.
                    </p>
                  </div>

                  <Link
                    to="/upload"
                    className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold hover:bg-orange-400"
                  >
                    <Upload size={16} />
                    Create Short
                  </Link>
                </div>

                {shortsLoading ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={index}
                        className="aspect-video animate-pulse rounded-2xl bg-orange-500/[0.05]"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <Video size={17} className="text-orange-300" />
                        <h3 className="text-lg font-bold">
                          Unpublished drafts
                        </h3>
                        <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-gray-400">
                          {drafts.length}
                        </span>
                      </div>

                      {drafts.length ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {drafts.map((short) => (
                            <ShortCard
                              key={short.id}
                              short={short}
                              busy={busyShortId === short.id}
                              onPublish={(id) =>
                                handleShortAction(id, 'publishShort')
                              }
                              onDelete={(id) => {
                                if (
                                  window.confirm(
                                    'Delete this Short permanently?',
                                  )
                                ) {
                                  handleShortAction(id, 'deleteShort')
                                }
                              }}
                              onSchedule={(id, date) =>
                                handleShortAction(id, 'scheduleShort', date)
                              }
                              onCancelSchedule={(id) =>
                                handleShortAction(id, 'cancelShortSchedule')
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <SectionEmpty
                          icon={Video}
                          title="No drafts yet"
                          description="Upload a Short and save it as a draft. It will appear here."
                          action={
                            <Link
                              to="/upload"
                              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold hover:bg-orange-400"
                            >
                              <Upload size={16} />
                              Upload a Short
                            </Link>
                          }
                        />
                      )}
                    </div>

                    <div className="mt-10">
                      <div className="mb-4 flex items-center gap-2">
                        <CalendarClock size={17} className="text-amber-300" />
                        <h3 className="text-lg font-bold">
                          Scheduled Shorts
                        </h3>
                        <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-gray-400">
                          {scheduledShorts.length}
                        </span>
                      </div>

                      {scheduledShorts.length ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {scheduledShorts.map((short) => (
                            <ShortCard
                              key={short.id}
                              short={short}
                              scheduled
                              busy={busyShortId === short.id}
                              onPublish={(id) =>
                                handleShortAction(id, 'publishShort')
                              }
                              onDelete={(id) => {
                                if (
                                  window.confirm(
                                    'Delete this Short permanently?',
                                  )
                                ) {
                                  handleShortAction(id, 'deleteShort')
                                }
                              }}
                              onSchedule={(id, date) =>
                                handleShortAction(id, 'scheduleShort', date)
                              }
                              onCancelSchedule={(id) =>
                                handleShortAction(id, 'cancelShortSchedule')
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <SectionEmpty
                          icon={CalendarClock}
                          title="Nothing scheduled"
                          description="When you schedule one of your drafts, it will appear here."
                        />
                      )}
                    </div>

                    <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-gray-500">
                      <Calendar
                        size={14}
                        className="mt-0.5 shrink-0 text-orange-300"
                      />
                      Scheduling saves your publication time. Automatic
                      publishing still requires the Supabase server-side
                      scheduler.
                    </p>
                  </>
                )}
              </section>
            )}

            {activeTab === 'playlists' && (
              <section>
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-2xl font-black">Your Playlists</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Organize Shorts you have saved from creators.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreatePlaylist((current) => !current)
                    }
                    className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold hover:bg-orange-400"
                  >
                    <FolderPlus size={17} />
                    Create playlist
                  </button>
                </div>

                {showCreatePlaylist && (
                  <form
                    onSubmit={handleCreatePlaylist}
                    className="mb-6 max-w-xl rounded-2xl border border-orange-400/20 bg-[#17100b] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold">New playlist</h3>
                      <button
                        type="button"
                        onClick={() => setShowCreatePlaylist(false)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <label className="mb-2 block text-xs font-semibold text-gray-300">
                      Playlist name
                    </label>
                    <input
                      value={playlistName}
                      onChange={(event) =>
                        setPlaylistName(event.target.value)
                      }
                      maxLength={60}
                      required
                      placeholder="e.g. Anime edits"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/50"
                    />

                    <label className="mb-2 mt-4 block text-xs font-semibold text-gray-300">
                      Description (optional)
                    </label>
                    <textarea
                      value={playlistDescription}
                      onChange={(event) =>
                        setPlaylistDescription(event.target.value)
                      }
                      maxLength={200}
                      rows={3}
                      placeholder="What is this playlist about?"
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/50"
                    />

                    <button
                      type="submit"
                      disabled={creatingPlaylist || !playlistName.trim()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold hover:bg-orange-400 disabled:opacity-50"
                    >
                      {creatingPlaylist ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Create playlist
                    </button>
                  </form>
                )}

                {playlistsLoading ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={index}
                        className="h-36 animate-pulse rounded-2xl bg-orange-500/[0.05]"
                      />
                    ))}
                  </div>
                ) : playlists.length ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-400">
                        {playlistCount}{' '}
                        {playlistCount === 1 ? 'playlist' : 'playlists'} in
                        your library
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {playlists.map((playlist) => {
                        const shortCount =
                          playlist.short_count ??
                          playlist.shorts_count ??
                          playlist.video_count ??
                          playlist.count ??
                          playlistSavedShorts.filter(
                            (item) => item.__playlistId === playlist.id,
                          ).length

                        return (
                          <button
                            type="button"
                            key={playlist.id}
                            onClick={() => loadPlaylistShorts(playlist)}
                            className={`rounded-2xl border p-5 text-left transition ${
                              activePlaylist?.id === playlist.id
                                ? 'border-orange-400/40 bg-orange-500/10'
                                : 'border-orange-500/10 bg-[#17100b] hover:border-orange-400/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                <ListVideo size={23} />
                              </div>
                              <ArrowRight
                                size={17}
                                className="text-gray-500"
                              />
                            </div>

                            <h3 className="mt-4 font-bold text-white">
                              {playlist.name}
                            </h3>

                            <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                              {playlist.description ||
                                'Your saved Shorts playlist'}
                            </p>

                            <p className="mt-3 text-xs font-semibold text-orange-300">
                              {shortCount}{' '}
                              {Number(shortCount) === 1 ? 'Short' : 'Shorts'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <SectionEmpty
                    icon={ListVideo}
                    title="No playlists yet"
                    description="Create a playlist to organize the Shorts you save from other creators."
                    action={
                      <button
                        type="button"
                        onClick={() => setShowCreatePlaylist(true)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold hover:bg-orange-400"
                      >
                        <FolderPlus size={16} />
                        Create your first playlist
                      </button>
                    }
                  />
                )}

                {activePlaylist && (
                  <div className="mt-10 border-t border-orange-500/10 pt-8">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-300">
                          Selected playlist
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {activePlaylist.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {playlistShorts.length}{' '}
                          {playlistShorts.length === 1 ? 'Short' : 'Shorts'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePlaylist(null)
                          setPlaylistShorts([])
                        }}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5"
                      >
                        Close playlist
                      </button>
                    </div>

                    {playlistShortsLoading ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }, (_, index) => (
                          <div
                            key={index}
                            className="aspect-video animate-pulse rounded-2xl bg-orange-500/[0.05]"
                          />
                        ))}
                      </div>
                    ) : playlistShorts.length ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {playlistShorts.map((item, index) =>
                          renderSavedShort(item, index, true),
                        )}
                      </div>
                    ) : (
                      <SectionEmpty
                        icon={Video}
                        title="This playlist is empty"
                        description="Save Shorts and add them to this playlist to build your collection."
                      />
                    )}
                  </div>
                )}

                <div className="mt-12 border-t border-orange-500/10 pt-8">
                  <div className="mb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">Saved Shorts</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Your saved Shorts, including Shorts collected in
                          your playlists.
                        </p>
                      </div>

                      <span className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-300">
                        {savedShortsCount} saved
                      </span>
                    </div>
                  </div>

                  {savedShortsLoading || playlistsLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <div
                          key={index}
                          className="aspect-video animate-pulse rounded-2xl bg-orange-500/[0.05]"
                        />
                      ))}
                    </div>
                  ) : combinedSavedShorts.length ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {combinedSavedShorts.map((item, index) =>
                        renderSavedShort(item, index),
                      )}
                    </div>
                  ) : (
                    <SectionEmpty
                      icon={Bookmark}
                      title="No saved Shorts yet"
                      description="When you save a Short or add one to a playlist, it will appear here."
                      action={
                        <Link
                          to="/shorts"
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold hover:bg-orange-400"
                        >
                          <Play size={16} />
                          Explore Shorts
                        </Link>
                      }
                    />
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <section className="mt-14">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
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
              className="inline-flex items-center gap-2 self-start text-sm font-semibold text-orange-300 hover:text-orange-200 sm:self-auto"
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
          ) : suggestions.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {suggestions.map((anime) => (
                <RecommendationCard
                  key={anime.mal_id || anime.id}
                  anime={anime}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-orange-500/10 bg-[#17100b] p-6 text-center">
              <p className="text-sm text-gray-400">
                Recommendations are temporarily unavailable.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-orange-500/10 pt-6 text-center text-xs text-gray-600 sm:flex-row sm:text-left">
          <span className="inline-flex items-center gap-2">
            <Sparkles size={14} className="text-orange-400" />
            Anime Vault · Your anime, your universe.
          </span>
          <span>Keep discovering. Keep collecting.</span>
        </footer>
      </div>

      {removingAnime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-anime-title"
            className="w-full max-w-md rounded-3xl border border-orange-500/10 bg-[#17100b] p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <Trash2 size={22} />
            </div>

            <h2
              id="remove-anime-title"
              className="mt-5 text-xl font-bold"
            >
              Remove from your vault?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Remove{' '}
              <span className="font-semibold text-white">
                {removingAnime.anime_title}
              </span>{' '}
              from your saved collection?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setRemovingAnime(null)}
                disabled={Boolean(removingId)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-40"
              >
                Keep anime
              </button>

              <button
                type="button"
                onClick={handleRemoveAnime}
                disabled={Boolean(removingId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {removingId ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Remove
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
