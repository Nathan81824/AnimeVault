import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  UserRound,
  Camera,
  Pencil,
  Check,
  X,
  Users,
  UserPlus,
  UserCheck,
  Clapperboard,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'

function getInitials(name) {
  return (name || 'AV')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDate(date) {
  if (!date) return 'Anime Vault member'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return 'Anime Vault member'

  return `Joined ${parsed.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })}`
}

function ProfileAvatar({ src, name, size = 'large' }) {
  const sizeClass =
    size === 'small'
      ? 'h-12 w-12 text-sm'
      : 'h-28 w-28 text-3xl sm:h-36 sm:w-36 sm:text-4xl'

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#12121c] bg-gradient-to-br from-violet-500 to-fuchsia-700 font-black text-white shadow-xl shadow-violet-950/30 ${sizeClass}`}
    >
      {src ? (
        <img
          src={src}
          alt={`${name}'s avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}

export default function Profile() {
  const { id } = useParams()
  const user = useAuthStore((state) => state.user)

  const profileId = id || user?.id
  const isOwnProfile = Boolean(user?.id && profileId === user.id)

  const [profile, setProfile] = useState(null)
  const [savedCount, setSavedCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
  })

  const loadProfile = useCallback(async () => {
    if (!profileId || !supabase) {
      setProfile(null)
      setLoading(false)

      if (!supabase) {
        setError('Supabase is not configured. Check your environment variables.')
      }

      return
    }

    setLoading(true)
    setError('')
    setNotice('')

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, created_at')
      .eq('id', profileId)
      .maybeSingle()

    if (profileError) {
      setError('Could not load this profile. Please try again.')
      setProfile(null)
      setLoading(false)
      return
    }

    if (!profileData) {
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(profileData)
    setForm({
      username: profileData.username ?? '',
      display_name: profileData.display_name ?? '',
      bio: profileData.bio ?? '',
      avatar_url: profileData.avatar_url ?? '',
    })

    const [
      savedResult,
      followersResult,
      followingResult,
      subscriptionResult,
    ] = await Promise.all([
      supabase
        .from('saved_anime')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId),

      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', profileId),

      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('subscriber_id', profileId),

      user?.id && user.id !== profileId
        ? supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', profileId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    setSavedCount(savedResult.count ?? 0)
    setFollowerCount(followersResult.count ?? 0)
    setFollowingCount(followingResult.count ?? 0)
    setIsSubscribed(Boolean(subscriptionResult.data))

    setLoading(false)
  }, [profileId, user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()

    if (!user?.id || !supabase) return

    const username = form.username.trim().replace(/^@/, '').toLowerCase()
    const displayName = form.display_name.trim()
    const bio = form.bio.trim()
    const avatarUrl = form.avatar_url.trim()

    if (!username) {
      setError('Please choose a username.')
      return
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setError('Username must be 3–24 characters and use only letters, numbers, or underscores.')
      return
    }

    if (displayName.length > 50) {
      setError('Display name must be 50 characters or fewer.')
      return
    }

    if (bio.length > 300) {
      setError('Your bio must be 300 characters or fewer.')
      return
    }

    if (avatarUrl) {
      try {
        const parsedUrl = new URL(avatarUrl)

        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          throw new Error('Invalid URL')
        }
      } catch {
        setError('Enter a valid image URL beginning with https:// or http://.')
        return
      }
    }

    setSaving(true)
    setError('')
    setNotice('')

    const { data, error: saveError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username,
          display_name: displayName || username,
          bio,
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'id' }
      )
      .select('id, username, display_name, bio, avatar_url, created_at')
      .single()

    if (saveError) {
      setError(
        saveError.code === '23505'
          ? 'That username is already taken. Try another one.'
          : 'Could not save your profile. Check your Supabase profile policies and try again.'
      )
    } else {
      setProfile(data)
      setForm({
        username: data.username ?? '',
        display_name: data.display_name ?? '',
        bio: data.bio ?? '',
        avatar_url: data.avatar_url ?? '',
      })
      setEditing(false)
      setNotice('Your profile has been updated.')
    }

    setSaving(false)
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file || !user?.id || !supabase) return

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Your image must be smaller than 3 MB.')
      return
    }

    setUploadingAvatar(true)
    setError('')
    setNotice('')

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      setError('Could not upload your avatar. Check that the avatars storage bucket and policies exist.')
      setUploadingAvatar(false)
      event.target.value = ''
      return
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    setForm((current) => ({
      ...current,
      avatar_url: data.publicUrl,
    }))

    setNotice('Avatar uploaded. Save your profile to apply it.')
    setUploadingAvatar(false)
    event.target.value = ''
  }

  async function handleSubscription() {
    if (!user?.id || !profile || !supabase || subscribing) return

    setSubscribing(true)
    setError('')
    setNotice('')

    if (isSubscribed) {
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscriber_id', user.id)
        .eq('creator_id', profile.id)

      if (deleteError) {
        setError('Could not unsubscribe. Please try again.')
      } else {
        setIsSubscribed(false)
        setFollowerCount((count) => Math.max(0, count - 1))
        setNotice('You have unsubscribed from this creator.')
      }
    } else {
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: profile.id,
        })

      if (insertError) {
        setError(
          insertError.code === '23505'
            ? 'You are already subscribed to this creator.'
            : 'Could not subscribe. Check your Supabase subscription policies.'
        )
      } else {
        setIsSubscribed(true)
        setFollowerCount((count) => count + 1)
        setNotice('You are now subscribed to this creator.')
      }
    }

    setSubscribing(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#09090f] text-violet-300">
        <LoaderCircle size={34} className="animate-spin" />
      </div>
    )
  }

  if (!profile && !isOwnProfile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#09090f] px-5 text-center text-white">
        <UserRound size={48} className="mb-4 text-violet-400" />
        <h1 className="text-2xl font-black">Profile not found</h1>
        <p className="mt-2 text-sm text-gray-400">
          This profile may not exist or may not be available.
        </p>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <Link
          to="/explore"
          className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500"
        >
          Explore Anime Vault
        </Link>
      </div>
    )
  }

  if (!profile && isOwnProfile) {
    return (
      <div className="min-h-screen bg-[#09090f] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#12121c] p-6 sm:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <UserRound size={28} />
          </div>

          <h1 className="text-2xl font-black">Create your profile</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Set up your Anime Vault profile so other anime fans can find you.
          </p>

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

          <button
            type="button"
            onClick={() => {
              setEditing(true)
              setProfile({
                id: user.id,
                username: '',
                display_name: '',
                bio: '',
                avatar_url: '',
                created_at: new Date().toISOString(),
              })
            }}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500"
          >
            Set up profile
          </button>

          {editing && (
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  required
                  minLength={3}
                  maxLength={24}
                  placeholder="anime_fan123"
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="display_name" className="mb-2 block text-sm font-medium text-gray-300">
                  Display name
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  value={form.display_name}
                  onChange={handleFormChange}
                  maxLength={50}
                  placeholder="Your display name"
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="bio" className="mb-2 block text-sm font-medium text-gray-300">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleFormChange}
                  maxLength={300}
                  rows={4}
                  placeholder="Tell other anime fans a little about yourself..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="avatar_url" className="mb-2 block text-sm font-medium text-gray-300">
                  Avatar image URL (optional)
                </label>
                <input
                  id="avatar_url"
                  name="avatar_url"
                  type="url"
                  value={form.avatar_url}
                  onChange={handleFormChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
                {saving ? 'Saving...' : 'Create profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username || 'Anime fan'

  return (
    <div className="min-h-screen bg-[#09090f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/80 via-[#171329] to-[#10101a]">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-fuchsia-600/10 blur-3xl" />

          <div className="relative px-6 pb-7 pt-8 sm:px-10 sm:pt-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <ProfileAvatar src={profile.avatar_url} name={displayName} />

              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                  Anime Vault member
                </p>
                <h1 className="break-words text-3xl font-black sm:text-4xl">
                  {displayName}
                </h1>
                {profile.username && (
                  <p className="mt-1 text-sm text-gray-400">@{profile.username}</p>
                )}
                <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                  {profile.bio || 'This anime fan has not added a bio yet.'}
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <CalendarDays size={14} />
                  {formatDate(profile.created_at)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setNotice('')
                      setEditing(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
                  >
                    <Pencil size={16} />
                    Edit profile
                  </button>
                ) : user ? (
                  <button
                    type="button"
                    onClick={handleSubscription}
                    disabled={subscribing}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-50 ${
                      isSubscribed
                        ? 'border border-white/10 bg-white/5 text-gray-200 hover:border-red-400/30 hover:text-red-300'
                        : 'bg-violet-600 text-white hover:bg-violet-500'
                    }`}
                  >
                    {subscribing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : isSubscribed ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    {subscribing ? 'Please wait...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold hover:bg-violet-500"
                  >
                    <UserPlus size={16} />
                    Sign in to subscribe
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              error
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-violet-400/20 bg-violet-500/10 text-violet-200'
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#12121c] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Users size={20} />
            </div>
            <p className="text-2xl font-black">{followerCount}</p>
            <p className="mt-1 text-sm text-gray-400">Subscribers</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12121c] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-300">
              <UserRound size={20} />
            </div>
            <p className="text-2xl font-black">{followingCount}</p>
            <p className="mt-1 text-sm text-gray-400">Following</p>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/10 bg-[#12121c] p-5 sm:col-span-1">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
              <Clapperboard size={20} />
            </div>
            <p className="text-2xl font-black">{savedCount}</p>
            <p className="mt-1 text-sm text-gray-400">Saved anime</p>
          </div>
        </div>

        {editing && isOwnProfile && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#12121c] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Edit your profile</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Update how other anime fans see you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setForm({
                    username: profile.username ?? '',
                    display_name: profile.display_name ?? '',
                    bio: profile.bio ?? '',
                    avatar_url: profile.avatar_url ?? '',
                  })
                  setEditing(false)
                  setError('')
                  setNotice('')
                }}
                aria-label="Cancel editing"
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ProfileAvatar
                  src={form.avatar_url}
                  name={form.display_name || form.username}
                  size="small"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
                    <Camera size={17} />
                    {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-500">Image up to 3 MB</span>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-username" className="mb-2 block text-sm font-medium text-gray-300">
                    Username
                  </label>
                  <input
                    id="edit-username"
                    name="username"
                    value={form.username}
                    onChange={handleFormChange}
                    required
                    minLength={3}
                    maxLength={24}
                    className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    3–24 letters, numbers, or underscores.
                  </p>
                </div>

                <div>
                  <label htmlFor="edit-display-name" className="mb-2 block text-sm font-medium text-gray-300">
                    Display name
                  </label>
                  <input
                    id="edit-display-name"
                    name="display_name"
                    value={form.display_name}
                    onChange={handleFormChange}
                    maxLength={50}
                    placeholder="Your display name"
                    className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-bio" className="mb-2 block text-sm font-medium text-gray-300">
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleFormChange}
                  maxLength={300}
                  rows={4}
                  placeholder="What anime do you enjoy?"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
                <p className="mt-2 text-right text-xs text-gray-500">
                  {form.bio.length}/300
                </p>
              </div>

              <div>
                <label htmlFor="edit-avatar-url" className="mb-2 block text-sm font-medium text-gray-300">
                  Avatar URL
                </label>
                <input
                  id="edit-avatar-url"
                  name="avatar_url"
                  type="url"
                  value={form.avatar_url}
                  onChange={handleFormChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  {saving ? 'Saving...' : 'Save changes'}
                </button>

                <button
                  type="button"
                  onClick={loadProfile}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"
                >
                  <RefreshCw size={16} />
                  Reload profile
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-[#12121c] p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Clapperboard size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {isOwnProfile ? 'Your anime collection' : `${displayName}'s profile`}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {isOwnProfile
                  ? 'Keep exploring and saving anime to your vault.'
                  : 'Check out Anime Vault and build your own collection.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isOwnProfile && (
              <Link
                to="/my-vault"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"
              >
                <Clapperboard size={17} />
                Open My Vault
              </Link>
            )}

            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              Explore anime
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}