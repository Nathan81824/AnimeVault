import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  UserRound,
  UserCheck,
  UserPlus,
  Sparkles,
  RefreshCw,
  Clapperboard,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'

function CreatorAvatar({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-16 w-16 rounded-full border-2 border-violet-400/30 object-cover"
      />
    )
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-400/20 bg-violet-500/10 text-violet-300">
      <UserRound size={28} />
    </div>
  )
}

function CreatorCard({ creator, subscribed, busy, onToggle }) {
  const name =
    creator.display_name ||
    creator.username ||
    'Anime creator'

  return (
    <article className="rounded-2xl border border-white/10 bg-[#12121c] p-5 transition hover:border-violet-500/40">
      <div className="flex items-center gap-4">
        <CreatorAvatar src={creator.avatar_url} name={name} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-white">{name}</h3>
          {creator.username && (
            <p className="truncate text-sm text-gray-500">
              @{creator.username}
            </p>
          )}
          {creator.bio && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
              {creator.bio}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Link
          to={`/profile/${creator.id}`}
          className="text-sm font-semibold text-violet-300 transition hover:text-violet-200"
        >
          View profile
        </Link>

        <button
          type="button"
          onClick={() => onToggle(creator)}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            subscribed
              ? 'border border-white/10 bg-white/5 text-gray-300 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300'
              : 'bg-violet-600 text-white hover:bg-violet-500'
          }`}
        >
          {subscribed ? <UserCheck size={16} /> : <UserPlus size={16} />}
          {busy ? 'Please wait...' : subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>
    </article>
  )
}

export default function Subscriptions() {
  const user = useAuthStore((state) => state.user)

  const [subscriptions, setSubscriptions] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [discoverLoading, setDiscoverLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('subscriptions')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setSubscriptions([])
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

    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, creator_id, created_at')
      .eq('subscriber_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('Could not load subscriptions. Check your Supabase table and permissions.')
      setSubscriptions([])
      setLoading(false)
      return
    }

    const creatorIds = [...new Set((data ?? []).map((item) => item.creator_id))]

    if (creatorIds.length === 0) {
      setSubscriptions([])
      setLoading(false)
      return
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .in('id', creatorIds)

    if (profileError) {
      setError('Subscriptions loaded, but creator profiles could not be loaded.')
      setSubscriptions([])
    } else {
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

      setSubscriptions(
        (data ?? [])
          .map((item) => ({
            ...item,
            creator: profileMap.get(item.creator_id),
          }))
          .filter((item) => item.creator)
      )
    }

    setLoading(false)
  }, [user?.id])

  const loadCreators = useCallback(async () => {
    if (!supabase) {
      setDiscoverLoading(false)
      return
    }

    setDiscoverLoading(true)

    const { data, error: creatorError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .neq('id', user?.id ?? '')
      .limit(30)

    if (creatorError) {
      setCreators([])
    } else {
      setCreators(data ?? [])
    }

    setDiscoverLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadSubscriptions()
    loadCreators()
  }, [loadSubscriptions, loadCreators])

  const subscribedIds = new Set(subscriptions.map((item) => item.creator_id))

  const currentCreators =
    activeTab === 'subscriptions'
      ? subscriptions.map((item) => item.creator)
      : creators

  const filteredCreators = currentCreators.filter((creator) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    return (
      (creator.display_name ?? '').toLowerCase().includes(query) ||
      (creator.username ?? '').toLowerCase().includes(query) ||
      (creator.bio ?? '').toLowerCase().includes(query)
    )
  })

  async function handleToggleSubscription(creator) {
    if (!user?.id) return

    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }

    setBusyId(creator.id)
    setError('')
    setNotice('')

    const existing = subscriptions.find(
      (item) => item.creator_id === creator.id
    )

    if (existing) {
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', existing.id)
        .eq('subscriber_id', user.id)

      if (deleteError) {
        setError('Could not unsubscribe. Please try again.')
      } else {
        setSubscriptions((current) =>
          current.filter((item) => item.creator_id !== creator.id)
        )
        setNotice(`You unsubscribed from ${creator.display_name || creator.username || 'this creator'}.`)
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: creator.id,
        })
        .select('id, creator_id, created_at')
        .single()

      if (insertError) {
        setError('Could not subscribe. Check your Supabase table and permissions.')
      } else {
        setSubscriptions((current) => [
          { ...data, creator },
          ...current,
        ])
        setNotice(`You subscribed to ${creator.display_name || creator.username || 'this creator'}.`)
      }
    }

    setBusyId(null)
  }

  return (
    <div className="min-h-screen bg-[#09090f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/80 via-[#171329] to-[#10101a] p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                <Sparkles size={14} />
                YOUR ANIME COMMUNITY
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                My <span className="text-violet-400">Subscriptions</span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
                Follow your favorite creators and discover people sharing your anime interests.
              </p>
            </div>

            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-violet-400/20 bg-black/20">
              <Users size={22} className="mb-1 text-violet-300" />
              <span className="text-2xl font-black">{subscriptions.length}</span>
              <span className="text-xs text-gray-400">Following</span>
            </div>
          </div>
        </section>

        {!user ? (
          <section className="rounded-3xl border border-white/10 bg-[#12121c] px-5 py-14 text-center sm:py-20">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <Users size={30} />
            </div>

            <h2 className="text-xl font-bold">Find your anime community</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
              Sign in to subscribe to creators and keep track of the profiles you follow.
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500"
            >
              Sign in to continue
            </Link>
          </section>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 rounded-xl border border-white/10 bg-[#12121c] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('subscriptions')}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === 'subscriptions'
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Following
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === 'discover'
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Discover creators
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search creators..."
                  className="w-full rounded-xl border border-white/10 bg-[#12121c] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/60"
                />
              </div>
            </div>

            {(error || notice) && (
              <div
                className={`mb-5 rounded-xl border p-4 text-sm ${
                  error
                    ? 'border-red-500/20 bg-red-500/10 text-red-300'
                    : 'border-violet-400/20 bg-violet-500/10 text-violet-200'
                }`}
              >
                {error || notice}
              </div>
            )}

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {activeTab === 'subscriptions' ? 'Creators you follow' : 'Meet new creators'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {filteredCreators.length} {filteredCreators.length === 1 ? 'creator' : 'creators'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadSubscriptions()
                  loadCreators()
                }}
                aria-label="Refresh subscriptions"
                className="rounded-xl border border-white/10 bg-[#12121c] p-3 text-gray-300 transition hover:border-violet-500/40 hover:text-white"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            {(activeTab === 'subscriptions' ? loading : discoverLoading) ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl border border-white/5 bg-[#12121c]"
                  />
                ))}
              </div>
            ) : filteredCreators.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCreators.map((creator) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    subscribed={subscribedIds.has(creator.id)}
                    busy={busyId === creator.id}
                    onToggle={handleToggleSubscription}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[#12121c] px-5 py-12 text-center sm:py-16">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  {activeTab === 'subscriptions' ? (
                    <Users size={30} />
                  ) : (
                    <Clapperboard size={30} />
                  )}
                </div>

                <h3 className="text-xl font-bold">
                  {search.trim()
                    ? 'No creators found'
                    : activeTab === 'subscriptions'
                      ? 'You are not following anyone yet'
                      : 'No creators to discover yet'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                  {search.trim()
                    ? 'Try a different name or username.'
                    : activeTab === 'subscriptions'
                      ? 'Visit Discover creators to find profiles you want to follow.'
                      : 'Creator profiles will appear here when users have profiles in Anime Vault.'}
                </p>

                {!search.trim() && activeTab === 'subscriptions' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"
                  >
                    <UserPlus size={17} />
                    Discover creators
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}