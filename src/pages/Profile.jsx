import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  UserRound,
  Camera,
  Pencil,
  Check,
  X,
  Globe,
  Heart,
  Bookmark,
  Film,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Clapperboard,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'
import profileService from '../features/profile/profileService'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function ProfileAvatar({ src, name, size = 'large' }) {
  const sizeClass =
    size === 'small'
      ? 'h-12 w-12 text-lg'
      : 'h-28 w-28 text-4xl sm:h-36 sm:w-36 sm:text-5xl'

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#07050d] bg-gradient-to-br from-purple-500 to-fuchsia-700 font-black text-white shadow-xl ${sizeClass}`}>
      {src ? (
        <img
          src={src}
          alt={`${name || 'User'} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{name?.charAt(0)?.toUpperCase() || 'U'}</span>
      )}
    </div>
  )
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
        <Icon size={19} />
      </div>

      <div>
        <p className="text-lg font-black text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuthStore()

  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    favoriteAnime: '',
  })

  const isOwnProfile = Boolean(user?.id && profile?.id === user.id)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let result

      if (username) {
        const cleanUsername = username.trim().replace(/^@/, '')

        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', cleanUsername)
          .maybeSingle()

        if (queryError) throw queryError

        result = {
          data: data
            ? {
                id: data.id,
                username: data.username || '',
                displayName: data.display_name || '',
                avatarUrl: data.avatar_url || null,
                bio: data.bio || '',
                website: data.website || '',
                favoriteAnime: data.favorite_anime || '',
                createdAt: data.created_at || null,
                updatedAt: data.updated_at || null,
              }
            : null,
          error: null,
        }
      } else {
        if (!user?.id) {
          setProfile(null)
          return
        }

        result = await profileService.getOrCreateProfile(user)
      }

      if (result?.error) throw result.error

      const loadedProfile = result?.data || null

      setProfile(loadedProfile)

      if (loadedProfile) {
        setForm({
          displayName: loadedProfile.displayName || '',
          username: loadedProfile.username || '',
          bio: loadedProfile.bio || '',
          website: loadedProfile.website || '',
          favoriteAnime: loadedProfile.favoriteAnime || '',
        })
      } else {
        setForm({
          displayName: '',
          username: '',
          bio: '',
          website: '',
          favoriteAnime: '',
        })
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user, username])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!user?.id || !isOwnProfile) return

    if (!form.displayName.trim()) {
      setError('Please enter your display name.')
      return
    }

    const cleanUsername = form.username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')

    if (!cleanUsername) {
      setError('Please enter a username.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const result = await profileService.updateProfile(user.id, {
        displayName: form.displayName.trim(),
        username: cleanUsername,
        bio: form.bio.trim(),
        website: form.website.trim(),
        favoriteAnime: form.favoriteAnime.trim(),
      })

      if (result?.error) throw result.error

      const updatedProfile = result?.data || result

      setProfile((current) => ({
        ...current,
        ...updatedProfile,
        displayName: updatedProfile?.displayName || form.displayName.trim(),
        username: updatedProfile?.username || cleanUsername,
        bio: updatedProfile?.bio ?? form.bio.trim(),
        website: updatedProfile?.website ?? form.website.trim(),
        favoriteAnime: updatedProfile?.favoriteAnime ?? form.favoriteAnime.trim(),
      }))

      setForm((current) => ({
        ...current,
        username: cleanUsername,
      }))

      setEditing(false)
      setSuccess('Your profile has been updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file || !user?.id || !isOwnProfile) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Your image must be smaller than 5MB.')
      return
    }

    setUploadingAvatar(true)
    setError('')
    setSuccess('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const authenticatedUser = authData?.user

      if (!authenticatedUser?.id) {
        throw new Error('You are not authenticated. Please sign in again.')
      }

      if (authenticatedUser.id !== user.id) {
        throw new Error(
          'Your app user and Supabase session do not match. Please sign in again.'
        )
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${authenticatedUser.id}/avatar-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw new Error(
          `AVATAR STORAGE UPLOAD FAILED: ${uploadError.message}`
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = publicUrlData?.publicUrl

      if (!avatarUrl) {
        throw new Error('Could not generate your avatar URL.')
      }

      const result = await profileService.updateProfile(
        authenticatedUser.id,
        {
          avatarUrl,
        }
      )

      if (result?.error) {
        throw new Error(
          `PROFILE DATABASE UPDATE FAILED: ${result.error.message}`
        )
      }

      setProfile((current) => ({
        ...current,
        avatarUrl,
      }))

      setSuccess('Your profile picture has been updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingAvatar(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const cancelEditing = () => {
    setForm({
      displayName: profile?.displayName || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      website: profile?.website || '',
      favoriteAnime: profile?.favoriteAnime || '',
    })

    setEditing(false)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="animate-spin text-purple-400" size={38} />
          <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
        <UserRound size={48} className="mb-4 text-purple-400" />
        <h2 className="text-xl font-black text-white">Unable to load profile</h2>
        <p className="mt-2 max-w-md text-sm text-gray-400">{error}</p>

        <button
          onClick={loadProfile}
          className="mt-6 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
        <UserRound size={52} className="mb-4 text-purple-400" />
        <h2 className="text-2xl font-black text-white">Profile not found</h2>
        <p className="mt-2 text-sm text-gray-400">
          This profile may have been removed or the username may be incorrect.
        </p>

        <Link
          to="/explore"
          className="mt-6 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
        >
          Explore Anime
        </Link>
      </div>
    )
  }

  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'Anime Vault member'

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Anime Vault
        </Link>

        <button
          onClick={loadProfile}
          disabled={loading}
          className="rounded-xl border border-white/10 p-2.5 text-gray-400 transition hover:border-purple-500/40 hover:text-purple-400"
          title="Refresh profile"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#100c1a]">
        <div className="relative h-40 overflow-hidden bg-gradient-to-r from-purple-950 via-purple-700 to-fuchsia-900 sm:h-56">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.25),transparent_40%)]" />

          <div className="absolute bottom-5 right-5 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold tracking-widest text-purple-100 backdrop-blur-md">
            ANIME VAULT MEMBER
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative w-fit">
                <ProfileAvatar
                  src={profile.avatarUrl}
                  name={profile.displayName || profile.username}
                />

                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#100c1a] bg-purple-600 text-white transition hover:bg-purple-500 disabled:opacity-60"
                      title="Change profile picture"
                    >
                      {uploadingAvatar ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <Camera size={17} />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </>
                )}
              </div>

              <div className="pb-1">
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  {profile.displayName || profile.username}
                </h1>

                <p className="mt-1 text-sm text-purple-400">
                  @{profile.username}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Member since {joinedDate}
                </p>
              </div>
            </div>

            {isOwnProfile && (
              <div className="flex flex-wrap gap-2">
                {!editing ? (
                  <button
                    onClick={() => {
                      setEditing(true)
                      setError('')
                      setSuccess('')
                    }}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
                  >
                    <Pencil size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          )}

          {editing && isOwnProfile ? (
            <form onSubmit={handleSave} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Display Name
                  </label>
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    maxLength={60}
                    placeholder="Your display name"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Username
                  </label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    maxLength={30}
                    placeholder="yourusername"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  maxLength={300}
                  placeholder="Tell the Anime Vault community about yourself..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                />
                <p className="mt-1 text-right text-xs text-gray-600">
                  {form.bio.length}/300
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Website
                  </label>
                  <input
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Favorite Anime
                  </label>
                  <input
                    name="favoriteAnime"
                    value={form.favoriteAnime}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Your favorite anime"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Check size={17} />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div className="mt-7">
              <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-gray-300">
                {profile.bio || 'This user has not added a bio yet.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-4">
                {profile.website && (
                  <a
                    href={
                      /^https?:\/\//i.test(profile.website)
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-purple-400 transition hover:text-purple-300"
                  >
                    <Globe size={16} />
                    Website
                    <ExternalLink size={13} />
                  </a>
                )}

                {profile.favoriteAnime && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Heart size={16} className="text-pink-400" />
                    Favorite anime: {profile.favoriteAnime}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileStat
          icon={CalendarDays}
          label="Member Since"
          value={joinedDate}
        />

        <ProfileStat
          icon={Film}
          label="Anime Community"
          value="Anime Vault"
        />

        <ProfileStat
          icon={Heart}
          label="Favorite Anime"
          value={profile.favoriteAnime ? 'Added' : 'Not added'}
        />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              {isOwnProfile
                ? 'Your Anime Space'
                : `${profile.displayName || profile.username}'s Anime Space`}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Explore Anime Vault content and collections
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {isOwnProfile && (
            <Link
              to="/my-vault"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#100c1a] p-5 transition hover:border-purple-500/40 hover:bg-purple-500/[0.06]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition group-hover:bg-purple-500/20">
                <Bookmark size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white">My Vault</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Your saved anime and personal collections
                </p>
              </div>

              <ArrowLeft className="rotate-180 text-gray-600 transition group-hover:text-purple-400" size={18} />
            </Link>
          )}

          <Link
            to="/explore"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#100c1a] p-5 transition hover:border-purple-500/40 hover:bg-purple-500/[0.06]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400 transition group-hover:bg-fuchsia-500/20">
              <Clapperboard size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white">Explore Anime</h3>
              <p className="mt-1 text-xs text-gray-500">
                Discover your next favorite anime
              </p>
            </div>

            <ArrowLeft className="rotate-180 text-gray-600 transition group-hover:text-purple-400" size={18} />
          </Link>

          {isOwnProfile && profile.id && (
            <Link
              to={`/channel/${profile.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#100c1a] p-5 transition hover:border-purple-500/40 hover:bg-purple-500/[0.06]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition group-hover:bg-purple-500/20">
                <UserRound size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white">Your Channel</h3>
                <p className="mt-1 text-xs text-gray-500">
                  View your published Shorts and channel details
                </p>
              </div>

              <ArrowLeft className="rotate-180 text-gray-600 transition group-hover:text-purple-400" size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
