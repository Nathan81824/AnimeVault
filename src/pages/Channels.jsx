
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
} from 'lucide-react'

import channelService from '../features/channel/services/channelService'

const formatCount = (value = 0) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function ChannelAvatar({ src, name }) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound size={34} className="text-white/50" />
      )}
    </div>
  )
}

function ChannelCard({ channel }) {
  const name = channel.displayName || channel.username || 'Anime Vault User'

  return (
    <Link
      to={`/channel/${channel.id}`}
      className="group flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:bg-white/[0.06]"
    >
      <div className="relative mb-4">
        <ChannelAvatar src={channel.avatarUrl} name={name} />

        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#101010] bg-orange-500 text-white">
          <Clapperboard size={13} />
        </div>
      </div>

      <h3 className="max-w-full truncate text-base font-bold text-white transition group-hover:text-orange-400">
        {name}
      </h3>

      <p className="mt-1 max-w-full truncate text-sm text-white/40">
        @{channel.username || 'user'}
      </p>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/55">
        {channel.bio || 'Welcome to my Anime Vault channel.'}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
        <Users size={14} />
        <span>{formatCount(channel.subscriberCount)} subscribers</span>
      </div>

      <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-orange-500">
        Visit channel
        <ArrowRight size={15} />
      </div>
    </Link>
  )
}

function EmptyState({ search }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-400">
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
  const [channels, setChannels] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadChannels = useCallback(async () => {
    setLoading(true)
    setError('')

    const result = await channelService.getChannels()

    if (result.error) {
      setError(result.error.message || 'Unable to load channels.')
      setChannels([])
    } else {
      setChannels(result.data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

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
        (a, b) => b.subscriberCount - a.subscriberCount
      )
    }

    return filtered
  }, [channels, search, sort])

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-[#171717] to-[#111111] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
              <Users size={25} />
            </div>

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-400">
                  <Sparkles size={15} />
                  ANIME VAULT COMMUNITY
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Discover Channels
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
                  Find creators, explore their content, and discover new
                  people in the Anime Vault community.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-3">
                <Users className="text-orange-400" size={21} />
                <div>
                  <p className="text-xl font-bold">
                    {channels.length}
                  </p>
                  <p className="text-xs text-white/45">
                    Total channels
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search channels..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/50"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 sm:flex-none"
            >
              <option value="newest">Newest channels</option>
              <option value="popular">Most subscribers</option>
            </select>

            <button
              type="button"
              onClick={loadChannels}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">All Channels</h2>
            <p className="mt-1 text-sm text-white/40">
              {filteredChannels.length} channel
              {filteredChannels.length === 1 ? '' : 's'} found
            </p>
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
              className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
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
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
