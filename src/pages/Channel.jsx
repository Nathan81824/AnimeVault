
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  UserRound,
  Play,
  Users,
  Bell,
  BellRing,
  Pencil,
  Plus,
  Globe,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  Clapperboard,
  Video,
  ExternalLink,
  Info,
  Sparkles,
  ArrowRight,
  Eye,
  Camera,
  Heart,
  MessageCircle,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../features/auth/authStore'
import channelService from '../features/channel/services/channelService'
import profileService from '../features/profile/profileService'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatCount(value = 0) {
  const number = Number(value) || 0

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return number.toLocaleString()
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

function getYouTubeVideoId(url) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
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

function getEmbedUrl(url) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    const youtubeId = getYouTubeVideoId(url)

    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}`
    }

    if (host === 'vimeo.com') {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop()
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null
    }

    if (host === 'tiktok.com' || host === 'instagram.com') {
      return url
    }

    return null
  } catch {
    return null
  }
}

async function getShortStatistics(shortId, short) {
  const [viewsResult, likesResult, commentsResult] = await Promise.all([
    supabase
      .from('short_views')
      .select('short_id', { count: 'exact', head: true })
      .eq('short_id', shortId),

    supabase
      .from('short_likes')
      .select('short_id', { count: 'exact', head: true })
      .eq('short_id', shortId),

    supabase
      .from('short_comments')
      .select('short_id', { count: 'exact', head: true })
      .eq('short_id', shortId),
  ])

  if (viewsResult.error) {
    console.error('Could not load Short views:', viewsResult.error)
  }

  if (likesResult.error) {
    console.error('Could not load Short likes:', likesResult.error)
  }

  if (commentsResult.error) {
    console.error('Could not load Short comments:', commentsResult.error)
  }

  return {
    ...short,
    viewCount: viewsResult.error
      ? Number(short.viewCount || 0)
      : Number(viewsResult.count ?? 0),
    likeCount: likesResult.error
      ? Number(short.likeCount || 0)
      : Number(likesResult.count ?? 0),
    commentsCount: commentsResult.error
      ? Number(short.commentsCount || 0)
      : Number(commentsResult.count ?? 0),
  }
}

function ChannelAvatar({
  src,
  name,
  isOwner,
  uploading,
  onUploadClick,
  fileInputRef,
  onFileChange,
}) {
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[5px] border-[#17100b] bg-gradient-to-br from-orange-400 via-orange-600 to-amber-800 text-4xl font-black text-white shadow-[0_0_35px_rgba(249,115,22,0.25)] sm:text-5xl">
        {src ? (
          <img
            src={src}
            alt={`${name || 'Channel'} avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{name?.charAt(0)?.toUpperCase() || 'A'}</span>
        )}
      </div>

      {isOwner && (
        <>
          <button
            type="button"
            onClick={onUploadClick}
            disabled={uploading}
            title="Change channel picture"
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#17100b] bg-orange-500 text-white shadow-lg transition hover:scale-105 hover:bg-orange-400 disabled:opacity-60"
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

function ChannelStat({ icon: Icon, label, value }) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-orange-500/10 bg-[#1b120b] p-4 transition duration-300 hover:border-orange-500/35 hover:bg-orange-500/[0.07]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-400/15 bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500/20">
        <Icon size={21} />
      </div>

      <div className="min-w-0">
        <p className="text-xl font-black tracking-tight text-white">
          {formatCount(value)}
        </p>
        <p className="mt-0.5 text-xs font-medium text-orange-100/50">
          {label}
        </p>
      </div>
    </div>
  )
}

function ShortCard({ short }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)

  const videoUrl =
    short.videoUrl ||
    short.youtubeUrl ||
    short.video_url ||
    short.youtube_url ||
    short.video ||
    short.url

  const youtubeId = getYouTubeVideoId(videoUrl)

  const uploadedThumbnail =
    short.thumbnailUrl ||
    short.thumbnail_url ||
    short.thumbnail ||
    short.coverUrl ||
    short.cover_url

  const thumbnail =
    uploadedThumbnail ||
    (youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : null)

  const embedUrl = getEmbedUrl(videoUrl)

  const isExternalSocial =
    videoUrl?.includes('tiktok.com') ||
    videoUrl?.includes('instagram.com')

  const isDirectVideo =
    videoUrl && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoUrl)

  const showThumbnail = thumbnail && !thumbnailFailed

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#1b120b] transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_15px_40px_rgba(249,115,22,0.12)]">
      <Link
        to={`/shorts?id=${short.id}`}
        className="relative block aspect-[9/16] max-h-[390px] overflow-hidden bg-[#100a05]"
      >
        {showThumbnail ? (
          <img
            src={thumbnail}
            alt={short.title || 'Short thumbnail'}
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : isDirectVideo ? (
          <video
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-950 via-[#4a2109] to-black">
            <Clapperboard size={44} className="text-orange-400/70" />
            <span className="text-xs font-bold text-orange-100/50">
              Preview unavailable
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 transition group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 scale-90 items-center justify-center rounded-full border border-white/20 bg-orange-500/90 text-white opacity-0 shadow-xl backdrop-blur-md transition duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Play size={22} fill="currentColor" />
          </div>
        </div>

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
          <Play size={10} fill="currentColor" />
          Short
        </div>

        {short.duration && (
          <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            {short.duration}
          </div>
        )}
      </Link>

      <div className="p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white transition group-hover:text-orange-300">
          {short.title || 'Untitled Short'}
        </h3>

        {short.caption && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-orange-100/50">
            {short.caption}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-orange-500/10 pt-3 text-[11px] text-orange-100/50">
          <span className="flex items-center gap-1.5">
            <Eye size={13} />
            {formatCount(short.viewCount)} views
          </span>

          <span className="flex items-center gap-1.5">
            <Heart size={13} />
            {formatCount(short.likeCount)} likes
          </span>

          <span className="flex items-center gap-1.5">
            <MessageCircle size={13} />
            {formatCount(short.commentsCount)} comments
          </span>
        </div>

        <p className="mt-3 text-[11px] text-orange-100/35">
          {formatDate(short.publishedAt || short.createdAt)}
        </p>

        {isExternalSocial && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange-400 transition hover:text-orange-300"
          >
            Open original video
            <ExternalLink size={12} />
          </a>
        )}

        {embedUrl && !isExternalSocial && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange-400 transition hover:text-orange-300"
          >
            Watch original
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  )
}

function EmptyState({ isOwner, title, description }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-orange-500/25 bg-gradient-to-b from-orange-500/[0.08] to-transparent px-5 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-400 shadow-lg">
        <Clapperboard size={29} />
      </div>

      <h3 className="text-lg font-black text-white">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-orange-100/50">
        {description}
      </p>

      {isOwner && (
        <Link
          to="/upload"
          className="mt-6 flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-400"
        >
          <Plus size={17} />
          Create your first Short
        </Link>
      )}
    </div>
  )
}

export default function Channel() {
  const { userId } = useParams()
  const { user } = useAuthStore()

  const fileInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const [channel, setChannel] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadChannel = useCallback(async () => {
    if (!userId) {
      setError('Channel could not be found.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await channelService.getChannel(userId, user?.id)

      if (result?.error) throw result.error

      const loadedChannel = result?.data || result
      const channelShorts = loadedChannel.shorts || []

      const shortsWithStatistics = await Promise.all(
        channelShorts.map((short) => getShortStatistics(short.id, short)),
      )

      const totalViews = shortsWithStatistics.reduce(
        (total, short) => total + Number(short.viewCount || 0),
        0,
      )

      const totalLikes = shortsWithStatistics.reduce(
        (total, short) => total + Number(short.likeCount || 0),
        0,
      )

      const totalComments = shortsWithStatistics.reduce(
        (total, short) => total + Number(short.commentsCount || 0),
        0,
      )

      setChannel({
        ...loadedChannel,
        shorts: shortsWithStatistics,
        totalViews,
        totalLikes,
        totalComments,
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setChannel(null)
    } finally {
      setLoading(false)
    }
  }, [userId, user?.id])

  useEffect(() => {
    loadChannel()
  }, [loadChannel])

  const uploadChannelImage = async (file, type) => {
    if (!file || !user?.id || user.id !== channel?.profile?.id) return

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

      if (uploadError) {
        throw new Error(
          `${isBanner ? 'BANNER' : 'AVATAR'} STORAGE UPLOAD FAILED: ${uploadError.message}`,
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const imageUrl = publicUrlData?.publicUrl

      if (!imageUrl) {
        throw new Error('Could not generate your image URL.')
      }

      const profileUpdate = isBanner
        ? { bannerUrl: imageUrl }
        : { avatarUrl: imageUrl }

      const result = await profileService.updateProfile(
        authenticatedUser.id,
        profileUpdate,
      )

      if (result?.error) {
        throw new Error(`PROFILE UPDATE FAILED: ${result.error.message}`)
      }

      const field = isBanner ? 'bannerUrl' : 'avatarUrl'

      setChannel((current) => ({
        ...current,
        profile: {
          ...current.profile,
          [field]: imageUrl,
        },
      }))

      setSuccess(
        isBanner
          ? 'Your channel banner has been updated.'
          : 'Your channel picture has been updated.',
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (isBanner) {
        setUploadingBanner(false)
        if (bannerInputRef.current) bannerInputRef.current.value = ''
      } else {
        setUploadingAvatar(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarUpload = (event) => {
    uploadChannelImage(event.target.files?.[0], 'avatar')
  }

  const handleBannerUpload = (event) => {
    uploadChannelImage(event.target.files?.[0], 'banner')
  }

  const handleSubscription = async () => {
    if (!user?.id) {
      setError('Please sign in to subscribe to this channel.')
      return
    }

    if (!channel?.profile?.id || subscriptionLoading) return

    if (user.id === channel.profile.id) {
      setError('You cannot subscribe to your own channel.')
      return
    }

    setSubscriptionLoading(true)
    setError('')
    setSuccess('')

    try {
      if (channel.isSubscribed) {
        const result = await channelService.unsubscribe(
          channel.profile.id,
          user.id,
        )

        if (!result?.success) {
          throw result?.error || new Error('Unable to unsubscribe.')
        }

        setChannel((current) => ({
          ...current,
          isSubscribed: false,
          subscriberCount: Math.max(
            0,
            Number(current.subscriberCount || 0) - 1,
          ),
        }))
      } else {
        const result = await channelService.subscribe(
          channel.profile.id,
          user.id,
        )

        if (!result?.success) {
          throw result?.error || new Error('Unable to subscribe.')
        }

        if (!result.alreadySubscribed) {
          setChannel((current) => ({
            ...current,
            isSubscribed: true,
            subscriberCount: Number(current.subscriberCount || 0) + 1,
          }))
        } else {
          await loadChannel()
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubscriptionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-[#100a05]">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
            <LoaderCircle size={32} className="animate-spin text-orange-400" />
          </div>
          <p className="text-sm font-medium text-orange-100/60">
            Loading channel...
          </p>
        </div>
      </div>
    )
  }

  if (error && !channel) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center bg-[#100a05] px-5 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
          <UserRound size={38} />
        </div>

        <h2 className="text-2xl font-black text-white">
          Unable to load channel
        </h2>

        <p className="mt-3 max-w-md text-sm leading-6 text-orange-100/60">
          {error}
        </p>

        <button
          type="button"
          onClick={loadChannel}
          className="mt-7 flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    )
  }

  if (!channel?.profile) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center bg-[#100a05] px-5 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
          <UserRound size={38} />
        </div>

        <h2 className="text-2xl font-black text-white">Channel not found</h2>

        <p className="mt-3 text-sm text-orange-100/60">
          This channel may not exist or may no longer be available.
        </p>

        <Link
          to="/explore"
          className="mt-7 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          Explore Anime
        </Link>
      </div>
    )
  }

  const profile = channel.profile
  const shorts = channel.shorts || []
  const isOwner = channel.isOwner || user?.id === profile.id

  const displayName =
    profile.displayName || profile.username || 'Anime Vault User'

  const totalViews = Number(channel.totalViews || 0)
  const totalLikes = Number(channel.totalLikes || 0)
  const totalComments = Number(channel.totalComments || 0)
  const totalSubscribers = Number(channel.subscriberCount || 0)

  const tabs = [
    { id: 'home', label: 'Home', icon: Clapperboard },
    { id: 'shorts', label: 'Shorts', icon: Play },
    { id: 'about', label: 'About', icon: Info },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#100a05] pb-16 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-orange-600/[0.12] blur-[140px]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-500/15 bg-[#1b120b] shadow-2xl shadow-orange-950/20">
          <div className="group/banner relative h-44 overflow-hidden sm:h-60 lg:h-72">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt={`${displayName} channel banner`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-[#7c2d12] via-[#c2410c] to-[#431407]" />

                <div className="absolute -left-20 -top-32 h-80 w-80 rounded-full bg-orange-300/30 blur-[90px]" />
                <div className="absolute -right-20 bottom-[-130px] h-96 w-96 rounded-full bg-amber-300/25 blur-[100px]" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_30%),linear-gradient(120deg,transparent_30%,rgba(0,0,0,0.35))]" />

                <div className="absolute inset-0 opacity-[0.13]">
                  <div className="absolute -right-10 top-[-80px] h-80 w-80 rotate-45 border border-white/40" />
                  <div className="absolute right-24 top-[-100px] h-80 w-80 rotate-45 border border-white/30" />
                  <div className="absolute bottom-[-150px] left-1/3 h-80 w-80 rotate-45 border border-white/30" />
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition hover:border-orange-300/60 hover:bg-orange-500/90 disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 sm:top-6"
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
              Creator Channel
            </div>
          </div>

          <div className="px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <ChannelAvatar
                  src={profile.avatarUrl}
                  name={displayName}
                  isOwner={isOwner}
                  uploading={uploadingAvatar}
                  onUploadClick={() => fileInputRef.current?.click()}
                  fileInputRef={fileInputRef}
                  onFileChange={handleAvatarUpload}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-full break-words text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {displayName}
                    </h1>

                    {isOwner && (
                      <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-orange-300">
                        Your Channel
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm font-semibold text-orange-300">
                    @{profile.username || 'user'}
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-100/60">
                    {profile.bio || 'Welcome to my Anime Vault channel.'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                {isOwner ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3 text-sm font-bold text-orange-100 transition hover:border-orange-400/50 hover:bg-orange-500/15"
                    >
                      <Pencil size={16} />
                      Edit Profile
                    </Link>

                    <Link
                      to="/upload"
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:-translate-y-0.5 hover:bg-orange-400"
                    >
                      <Plus size={17} />
                      Create Short
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscription}
                    disabled={subscriptionLoading}
                    className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      channel.isSubscribed
                        ? 'border border-orange-500/20 bg-orange-500/[0.08] text-orange-100 hover:bg-orange-500/15'
                        : 'bg-orange-500 text-white shadow-lg shadow-orange-950/30 hover:-translate-y-0.5 hover:bg-orange-400'
                    }`}
                  >
                    {subscriptionLoading ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : channel.isSubscribed ? (
                      <BellRing size={17} />
                    ) : (
                      <Bell size={17} />
                    )}

                    {channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            <Info size={17} />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/[0.08] px-4 py-3 text-sm text-orange-300">
            {success}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <ChannelStat
            icon={MessageCircle}
            label="Total Comments"
            value={totalComments}
          />

          <ChannelStat
            icon={Heart}
            label="Total Likes"
            value={totalLikes}
          />

          <ChannelStat
            icon={Eye}
            label="Total Views"
            value={totalViews}
          />

          <ChannelStat
            icon={Users}
            label="Subscribers"
            value={totalSubscribers}
          />
        </section>

        <div className="mt-8 border-b border-orange-500/15">
          <div className="flex gap-7 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex shrink-0 items-center gap-2.5 py-4 text-sm font-bold transition ${
                    active
                      ? 'text-orange-300'
                      : 'text-orange-100/45 hover:text-orange-100'
                  }`}
                >
                  <Icon size={17} />
                  {tab.label}

                  {active && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'home' && (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-6 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full bg-orange-500" />
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      Channel Shorts
                    </h2>
                  </div>

                  <p className="mt-2 text-xs text-orange-100/45 sm:text-sm">
                    Discover the latest Shorts from this creator
                  </p>
                </div>

                {shorts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('shorts')}
                    className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-orange-400 transition hover:text-orange-300"
                  >
                    View all
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {shorts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                  {shorts.slice(0, 5).map((short) => (
                    <ShortCard key={short.id} short={short} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  isOwner={isOwner}
                  title="No published Shorts yet"
                  description={
                    isOwner
                      ? 'Your published Shorts will appear here when you share them with the Anime Vault community.'
                      : 'This creator has not published any Shorts yet. Check back later for new videos.'
                  }
                />
              )}
            </section>
          </div>
        )}

        {activeTab === 'shorts' && (
          <section className="mt-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                <Play size={20} fill="currentColor" />
              </div>

              <div>
                <h2 className="text-xl font-black text-white sm:text-2xl">
                  Published Shorts
                </h2>
                <p className="mt-1 text-xs text-orange-100/45">
                  All public Shorts from this channel
                </p>
              </div>
            </div>

            {shorts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {shorts.map((short) => (
                  <ShortCard key={short.id} short={short} />
                ))}
              </div>
            ) : (
              <EmptyState
                isOwner={isOwner}
                title="No Shorts available"
                description="Published Shorts will appear here when this channel shares videos."
              />
            )}
          </section>
        )}

        {activeTab === 'about' && (
          <section className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-orange-500/10 bg-[#1b120b] p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <Info size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-white">
                    About this channel
                  </h2>
                  <p className="mt-0.5 text-xs text-orange-100/45">
                    Get to know this creator
                  </p>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-7 text-orange-100/65">
                {profile.bio || 'This channel has not added a description yet.'}
              </p>

              {profile.website && (
                <a
                  href={
                    /^https?:\/\//i.test(profile.website)
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-fit items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3 text-sm font-semibold text-orange-300 transition hover:border-orange-400/40 hover:bg-orange-500/10"
                >
                  <Globe size={16} />
                  Visit website
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            <div className="rounded-3xl border border-orange-500/10 bg-[#1b120b] p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <Sparkles size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-white">
                    Channel Information
                  </h2>
                  <p className="mt-0.5 text-xs text-orange-100/45">
                    Creator details
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <CalendarDays size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">
                      Joined Anime Vault
                    </p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatDate(profile.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Users size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">Subscribers</p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatCount(totalSubscribers)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Video size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">
                      Published Shorts
                    </p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatCount(channel.shortsCount ?? shorts.length)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Eye size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">Total Views</p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatCount(totalViews)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Heart size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">Total Likes</p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatCount(totalLikes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <MessageCircle size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-orange-100/45">Total Comments</p>
                    <p className="mt-1 text-sm font-semibold text-orange-50">
                      {formatCount(totalComments)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
