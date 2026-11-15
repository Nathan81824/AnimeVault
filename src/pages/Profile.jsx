
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
  Play,
  Compass,
  Sparkles,
  Video,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'
import profileService from '../features/profile/profileService'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatDate(value) {
  if (!value) return 'Recently joined'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Recently joined'

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function ProfileAvatar({
  src,
  name,
  size = 'large',
  isOwner,
  uploading,
  onUploadClick,
  fileInputRef,
  onFileChange,
}) {
  const dimensions =
    size === 'large'
      ? 'h-28 w-28 sm:h-36 sm:w-36'
      : 'h-10 w-10'

  return (
    <div className={`relative shrink-0 ${dimensions}`}>
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[5px] border-[#110c1b] bg-gradient-to-br from-orange-400 via-orange-600 to-amber-800 font-black text-white shadow-[0_0_35px_rgba(249,115,22,0.2)] ${
          size === 'large' ? 'text-4xl sm:text-5xl' : 'text-base'
        }`}
      >
        {src ? (
          <img
            src={src}
            alt={`${name || 'Profile'} avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{name?.charAt(0)?.toUpperCase() || 'A'}</span>
        )}
      </div>

      {isOwner && size === 'large' && (
        <>
          <button
            type="button"
            onClick={onUploadClick}
            disabled={uploading}
            title="Change profile picture"
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#110c1b] bg-orange-500 text-white shadow-lg transition hover:scale-105 hover:bg-orange-400 disabled:opacity-60"
          >
            {uploading ? (
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
            onChange={onFileChange}
          />
        </>
      )}
    </div>
  )
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-orange-500/30 hover:bg-orange-500/[0.05]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/10 bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500/20">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-xl font-black tracking-tight text-white">
            {value}
          </p>
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}

function ActionCard({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#130e1e] p-4 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-orange-500/[0.04]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500/20">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-white transition group-hover:text-orange-300">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <ExternalLink
        size={16}
        className="shrink-0 text-gray-600 transition group-hover:text-orange-400"
      />
    </Link>
  )
}

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuthStore()

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    favoriteAnime: '',
  })

  const isOwner = !username || username === profile?.username

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let loadedProfile

      if (username) {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .maybeSingle()

        if (queryError) throw queryError
        if (!data) throw new Error('Profile not found.')

        loadedProfile = {
          ...data,
          displayName: data.display_name || data.displayName,
          avatarUrl: data.avatar_url || data.avatarUrl,
          bannerUrl: data.banner_url || data.bannerUrl,
          favoriteAnime: data.favorite_anime || data.favoriteAnime,
          createdAt: data.created_at || data.createdAt,
        }
      } else {
        if (!user) throw new Error('Please sign in to view your profile.')

        const result = await profileService.getOrCreateProfile(user)

        if (result?.error) throw result.error

        loadedProfile = result?.data || result

        loadedProfile = {
          ...loadedProfile,
          displayName:
            loadedProfile.displayName || loadedProfile.display_name,
          avatarUrl: loadedProfile.avatarUrl || loadedProfile.avatar_url,
          bannerUrl: loadedProfile.bannerUrl || loadedProfile.banner_url,
          favoriteAnime:
            loadedProfile.favoriteAnime || loadedProfile.favorite_anime,
          createdAt: loadedProfile.createdAt || loadedProfile.created_at,
        }
      }

      setProfile(loadedProfile)

      setForm({
        displayName: loadedProfile.displayName || '',
        username: loadedProfile.username || '',
        bio: loadedProfile.bio || '',
        website: loadedProfile.website || '',
        favoriteAnime: loadedProfile.favoriteAnime || '',
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [username, user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!user?.id || !profile?.id) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const result = await profileService.updateProfile(user.id, {
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        bio: form.bio.trim(),
        website: form.website.trim(),
        favoriteAnime: form.favoriteAnime.trim(),
      })

      if (result?.error) throw result.error

      setProfile((current) => ({
        ...current,
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        bio: form.bio.trim(),
        website: form.website.trim(),
        favoriteAnime: form.favoriteAnime.trim(),
      }))

      setEditing(false)
      setSuccess('Your profile has been updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const uploadProfileImage = async (file, type) => {
    if (!file || !user?.id || !isOwner) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Your image must be smaller than 5MB.')
      return
    }

    const isBanner = type === 'banner'

    if (isBanner) {
      setUploadingBanner(true)
    } else {
      setUploadingAvatar(true)
    }

    setError('')
    setSuccess('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const authenticatedUser = authData?.user

      if (!authenticatedUser?.id || authenticatedUser.id !== user.id) {
        throw new Error('Your session is invalid. Please sign in again.')
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

      const filePath = `${authenticatedUser.id}/${isBanner ? 'banner' : 'channel'}-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const imageUrl = publicUrlData?.publicUrl

      if (!imageUrl) {
        throw new Error('Could not generate your image URL.')
      }

      const update = isBanner
        ? { bannerUrl: imageUrl }
        : { avatarUrl: imageUrl }

      const result = await profileService.updateProfile(
        authenticatedUser.id,
        update,
      )

      if (result?.error) throw result.error

      setProfile((current) => ({
        ...current,
        ...update,
      }))

      setSuccess(
        isBanner
          ? 'Your channel banner has been updated.'
          : 'Your profile picture has been updated.',
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (isBanner) {
        setUploadingBanner(false)

        if (bannerInputRef.current) {
          bannerInputRef.current.value = ''
        }
      } else {
        setUploadingAvatar(false)

        if (avatarInputRef.current) {
          avatarInputRef.current.value = ''
        }
      }
    }
  }

  const handleAvatarUpload = (event) => {
    uploadProfileImage(event.target.files?.[0], 'avatar')
  }

  const handleBannerUpload = (event) => {
    uploadProfileImage(event.target.files?.[0], 'banner')
  }

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-[#09060e]">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
            <LoaderCircle size={32} className="animate-spin text-orange-400" />
          </div>
          <p className="text-sm font-medium text-gray-400">
            Loading profile...
          </p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center bg-[#09060e] px-5 text-center">
        <UserRound size={42} className="mb-5 text-orange-400" />
        <h2 className="text-2xl font-black text-white">
          Profile unavailable
        </h2>
        <p className="mt-3 max-w-md text-sm text-gray-400">{error}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-6 flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    )
  }

  const displayName =
    profile.displayName || profile.username || 'Anime Vault User'

  const websiteUrl = profile.website
    ? /^https?:\/\//i.test(profile.website)
      ? profile.website
      : `https://${profile.website}`
    : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09060e] pb-16 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[450px] w-[850px] -translate-x-1/2 rounded-full bg-orange-600/[0.06] blur-[130px]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#110c1b] shadow-2xl shadow-black/20">
          {/* Same banner design as Channel.jsx */}
          <div className="group/banner relative h-44 overflow-hidden sm:h-60 lg:h-72">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt={`${displayName} banner`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-[#4a1d08] via-[#a9430b] to-[#1c0d05]" />

                <div className="absolute -left-20 -top-32 h-80 w-80 rounded-full bg-orange-400/20 blur-[90px]" />
                <div className="absolute -right-20 bottom-[-130px] h-96 w-96 rounded-full bg-amber-300/20 blur-[100px]" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(120deg,transparent_30%,rgba(0,0,0,0.35))]" />

                <div className="absolute inset-0 opacity-[0.13]">
                  <div className="absolute -right-10 top-[-80px] h-80 w-80 rotate-45 border border-white/40" />
                  <div className="absolute right-24 top-[-100px] h-80 w-80 rotate-45 border border-white/30" />
                  <div className="absolute bottom-[-150px] left-1/3 h-80 w-80 rotate-45 border border-white/30" />
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-black/25" />

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition hover:border-orange-400/50 hover:bg-orange-500/80 disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 sm:top-6"
                >
                  {uploadingBanner ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Camera size={15} />
                  )}
                  {uploadingBanner ? 'Uploading...' : 'Change banner'}
                </button>

                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
              </>
            )}

            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-2 text-[10px] font-black tracking-[0.2em] text-white/90 backdrop-blur-xl sm:bottom-7 sm:left-8">
              <Sparkles size={13} className="text-orange-200" />
              ANIME VAULT
            </div>

            <div className="absolute bottom-5 right-5 hidden items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur-xl sm:flex">
              <Video size={14} />
              Creator Profile
            </div>
          </div>

          {/* Avatar is below the banner, never over its text */}
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 lg:px-10">
            <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:pt-7">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                <ProfileAvatar
                  src={profile.avatarUrl}
                  name={displayName}
                  isOwner={isOwner}
                  uploading={uploadingAvatar}
                  onUploadClick={() => avatarInputRef.current?.click()}
                  fileInputRef={avatarInputRef}
                  onFileChange={handleAvatarUpload}
                />

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-full break-words text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {displayName}
                    </h1>

                    {isOwner && (
                      <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-orange-300">
                        Your Profile
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm font-medium text-orange-300">
                    @{profile.username || 'user'}
                  </p>

                  <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-gray-400">
                    {profile.bio || 'Welcome to my Anime Vault profile.'}
                  </p>

                  <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <CalendarDays size={14} className="text-orange-400" />
                    Joined {formatDate(profile.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:pb-1">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => setEditing((current) => !current)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:-translate-y-0.5 hover:bg-orange-400"
                  >
                    {editing ? <X size={16} /> : <Pencil size={16} />}
                    {editing ? 'Cancel Editing' : 'Edit Profile'}
                  </button>
                ) : (
                  <Link
                    to={`/channel/${profile.id}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
                  >
                    <Play size={16} />
                    View Channel
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            <InfoIcon />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/[0.08] px-4 py-3 text-sm text-orange-300">
            {success}
          </div>
        )}

        {editing && isOwner && (
          <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#130e1e] p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                <Pencil size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  Edit your profile
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Update how other Anime Vault members see you.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-400">
                    Display name
                  </span>
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={handleFormChange}
                    maxLength={60}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="Your display name"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-400">
                    Username
                  </span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleFormChange}
                    maxLength={30}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="yourusername"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold text-gray-400">
                    Bio
                  </span>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleFormChange}
                    rows={4}
                    maxLength={500}
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-500"
                    placeholder="Tell the Anime Vault community about yourself..."
                  />
                  <span className="mt-1 block text-right text-[11px] text-gray-600">
                    {form.bio.length}/500
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-400">
                    Website
                  </span>
                  <input
                    name="website"
                    value={form.website}
                    onChange={handleFormChange}
                    maxLength={200}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="https://example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-400">
                    Favorite anime
                  </span>
                  <input
                    name="favoriteAnime"
                    value={form.favoriteAnime}
                    onChange={handleFormChange}
                    maxLength={100}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="Your favorite anime"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-white/[0.07] pt-5">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <ProfileStat
            icon={Heart}
            label="Favorite Anime"
            value={profile.favoriteAnime ? 'Added' : 'Not set'}
          />
          <ProfileStat
            icon={Bookmark}
            label="Website"
            value={profile.website ? 'Added' : 'Not set'}
          />
          <ProfileStat
            icon={Film}
            label="Profile"
            value="Anime Fan"
          />
          <ProfileStat
            icon={CalendarDays}
            label="Member Since"
            value={new Date(profile.createdAt || Date.now()).getFullYear()}
          />
        </section>

        <section className="mt-9">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-orange-500" />
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Your Anime Space
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ActionCard
              to="/my-vault"
              icon={Bookmark}
              title="My Vault"
              description="Explore your saved anime and personal collection."
            />

            <ActionCard
              to="/explore"
              icon={Compass}
              title="Explore Anime"
              description="Discover new anime to add to your collection."
            />

            <ActionCard
              to={profile.id ? `/channel/${profile.id}` : '/channel'}
              icon={Video}
              title="Your Channel"
              description="Visit your creator channel and published Shorts."
            />

            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#130e1e] p-4 transition hover:-translate-y-1 hover:border-orange-500/30 hover:bg-orange-500/[0.04]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/10 text-orange-400">
                  <Globe size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white transition group-hover:text-orange-300">
                    Personal Website
                  </h3>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {profile.website}
                  </p>
                </div>
                <ExternalLink size={16} className="text-orange-400" />
              </a>
            ) : (
              <ActionCard
                to="/settings"
                icon={Globe}
                title="Add Your Website"
                description="Add a website to your profile information."
              />
            )}
          </div>
        </section>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-orange-400"
          >
            <ArrowLeft size={16} />
            Back to Anime Vault
          </Link>

          <p className="text-xs text-gray-600">
            Your world. Your anime. Your Vault.
          </p>
        </div>
      </div>
    </main>
  )
}

function InfoIcon() {
  return <span className="text-base font-black">!</span>
}
