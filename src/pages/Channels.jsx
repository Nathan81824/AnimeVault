
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  LoaderCircle,
  RefreshCw,
  UserRound,
  Sparkles,
  ArrowRight,
  Clapperboard,
  CircleUserRound,
  Eye,
} from 'lucide-react'

import channelService from '../features/channel/services/channelService'
import { useAuthStore } from '../features/auth/authStore'

const formatCount = (value = 0) => {
  const count = Number(value) || 0

  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`

  return count.toLocaleString()
}

const getChannelViews = (channel = {}) => {
  return Number(
    channel.totalViews ??
    channel.total_views ??
    channel.viewCount ??
    channel.view_count ??
    channel.views ??
    channel.viewsCount ??
    channel.views_count ??
    0
  ) || 0
}

function ChannelAvatar({ src, name }) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-orange-500/30 bg-orange-500/10">
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound size={34} className="text-orange-400" />
      )}
    </div>
  )
}

function ChannelCard({ channel, own = false }) {
  const name = channel.displayName || channel.username || 'Anime Vault User'
  const views = getChannelViews(channel)

  return (
    <Link
      to={`/channel/${channel.id}`}
      className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.08] to-white/[0.02] p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-[0_12px_40px_rgba(249,115,22,0.12)]"
    >
      {own && (
        <span className="absolute right-3 top-3 rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-300">
          Your Channel
        </span>
      )}

      <div className="relative mb-4 mt-3">
        <ChannelAvatar src={channel.avatarUrl} name={name} />

        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#101010] bg-orange-500 text-white shadow-lg shadow-orange-500/30">
          <Clapperboard size={13} />
        </div>
      </div>

      <h3 className="max-w-full truncate text-base font-bold text-white transition group-hover:text-orange-400">
        {name}
      </h3>

      <p className="mt-1 max-w-full truncate text-sm text-orange-300/60">
        @{channel.username || 'user'}
      </p>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/55">
        {channel.bio || 'Welcome to my Anime Vault channel.'}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
        <Eye size={16} />
        <span>{formatCount(views)} views</span>
      </div>

      <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/10 transition group-hover:from-orange-500 group-hover:to-orange-400">
        {own ? 'Open My Channel' : 'Visit Channel'}
        <ArrowRight size={15} />
      </div>
    </Link>
  )
}

function EmptyState({ search }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-orange-500/15 bg-orange-500/[0.03] px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-400">
        <Users size={30} />
      </div>

      <h3 className="text-lg font-bold text-white">
        {search ? 'No channels found' : 'No channels yet'}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-white/50">
        {search
          ? 'Try searching with a different name or username.'
          : 'Channels will appear here when people join Anime Vault.'}
      </p>
    </div>
  )
}

export default function Channels() {
  const { user, profile } = useAuthStore()

  const [channels, setChannels] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [activeTab, setActiveTab] = useState('discover')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadChannels = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await channelService.getChannels()

      if (result.error) {
        throw result.error
      }

      setChannels(result.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load channels.')
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const myChannel = useMemo(() => {
    if (!user?.id) return null

    const existingChannel = channels.find(
      (channel) => channel.id === user.id
    )

    return {
      ...existingChannel,
      id: user.id,
      displayName:
        profile?.displayName ||
        profile?.display_name ||
        profile?.full_name ||
        existingChannel?.displayName ||
        user.user_metadata?.displayName ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Anime Vault User',
      username:
        profile?.username ||
        existingChannel?.username ||
        user.user_metadata?.username ||
        'user',
      avatarUrl:
        profile?.avatarUrl ||
        profile?.avatar_url ||
        profile?.avatar ||
        existingChannel?.avatarUrl ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null,
      bio: profile?.bio || existingChannel?.bio || '',
      totalViews: getChannelViews(existingChannel || {}),
    }
  }, [user, profile, channels])

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = channels.filter((channel) => {
      const name = channel.displayName || ''
      const username = channel.username || ''
      const bio = channel.bio || ''

      return (
        name.toLowerCase().includes(query) ||
        username.toLowerCase().includes(query) ||
        bio.toLowerCase().includes(query)
      )
    })

    if (sort === 'popular') {
      return [...filtered].sort(
        (a, b) => getChannelViews(b) - getChannelViews(a)
      )
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
  }, [channels, search, sort])

  const totalCommunityViews = useMemo(() => {
    return channels.reduce(
      (total, channel) => total + getChannelViews(channel),
      0
    )
  }, [channels])

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-600/30 via-[#24140c] to-[#101010] p-6 shadow-[0_15px_60px_rgba(249,115,22,0.08)] sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-orange-600/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/20 text-orange-300 shadow-lg shadow-orange-500/10">
              <Users size={27} />
            </div>

            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-orange-400">
                  <Sparkles size={16} />
                  ANIME VAULT COMMUNITY
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Discover Channels<span className="text-orange-500">.</span>
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                  Discover creators, explore their Shorts, check out their
                  channels, and see how many views the community is getting.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-orange-400/20 bg-black/30 px-5 py-4">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Users size={17} />
                    <span className="text-xs font-semibold">Channels</span>
                  </div>
                  <p className="mt-2 text-2xl font-black">
                    {formatCount(channels.length)}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-400/20 bg-black/30 px-5 py-4">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Eye size={17} />
                    <span className="text-xs font-semibold">Total Views</span>
                  </div>
                  <p className="mt-2 text-2xl font-black">
                    {formatCount(totalCommunityViews)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-7 flex gap-2 overflow-x-auto border-b border-orange-500/20">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition ${
              activeTab === 'discover'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-white/45 hover:text-orange-300'
            }`}
          >
            <Users size={17} />
            Discover Channels
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition ${
              activeTab === 'mine'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-white/45 hover:text-orange-300'
            }`}
          >
            <CircleUserRound size={17} />
            My Channel
          </button>
        </div>

        {activeTab === 'discover' && (
          <>
            <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400/60"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search channels..."
                  className="w-full rounded-xl border border-orange-500/20 bg-[#17110e] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="flex-1 rounded-xl border border-orange-500/20 bg-[#17110e] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/60 sm:flex-none"
                >
                  <option value="newest">Newest channels</option>
                  <option value="popular">Most Views</option>
                </select>

                <button
                  type="button"
                  onClick={loadChannels}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? 'animate-spin' : ''}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </section>

            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  All Channels
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  {filteredChannels.length} channel
                  {filteredChannels.length === 1 ? '' : 's'} found
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Eye size={15} />
                View counts
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-4">
                <LoaderCircle
                  size={35}
                  className="animate-spin text-orange-500"
                />
                <p className="text-sm text-white/45">
                  Loading channels...
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 px-6 text-center">
                <p className="font-semibold text-red-400">
                  Something went wrong
                </p>
                <p className="mt-2 text-sm text-white/50">{error}</p>
                <button
                  type="button"
                  onClick={loadChannels}
                  className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  Try again
                </button>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="grid grid-cols-1">
                <EmptyState search={search} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    own={channel.id === user?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'mine' && (
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
                <Sparkles size={15} />
                YOUR CREATOR SPACE
              </div>

              <h2 className="mt-2 text-2xl font-black">
                My Channel
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                Visit your channel to see your Shorts, total views, and
                creator information.
              </p>
            </div>

            {!user ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] px-6 py-16 text-center">
                <UserRound size={36} className="text-orange-400" />

                <h3 className="mt-4 text-lg font-bold">
                  Sign in to access your channel
                </h3>

                <p className="mt-2 max-w-sm text-sm text-white/45">
                  You need to be signed in before you can access your
                  personal channel.
                </p>

                <Link
                  to="/login"
                  className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <ChannelCard channel={myChannel} own />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
