import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  Eye,
  Heart,
  UserRound,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  LoaderCircle,
  Share2,
} from 'lucide-react'

function getYouTubeVideoId(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const parts = url.pathname.split('/').filter(Boolean)

    if (host === 'youtu.be') {
      return parts[0] || null
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parts[0] === 'watch') {
        return url.searchParams.get('v')
      }

      if (['shorts', 'embed', 'live'].includes(parts[0])) {
        return parts[1] || null
      }
    }
  } catch {
    return null
  }

  return null
}

function formatCount(value) {
  const count = Number(value) || 0

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return String(count)
}

function sendYouTubeCommand(iframe, command) {
  if (!iframe?.contentWindow) return

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: 'command',
      func: command,
      args: [],
    }),
    '*',
  )
}

export default function ShortCard({
  short,
  video,
  className = '',
  isActive = false,
  isLiked = false,
  onLike,
  onUnlike,
  onComments,
  onNext,
  onPrevious,
  onView,
  commentsOpen = false,
  muted = true,
  onToggleMute,
}) {
  const item = short || video || {}

  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const viewRecordedRef = useRef(false)
  const playRequestRef = useRef(false)

  const [aspectRatio, setAspectRatio] = useState(9 / 16)
  const [playing, setPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localLikes, setLocalLikes] = useState(
    Number(item.like_count ?? item.likeCount ?? item.likes ?? 0),
  )
  const [localViews, setLocalViews] = useState(
    Number(item.view_count ?? item.viewCount ?? item.views ?? 0),
  )
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const videoUrl =
    item.video_url ||
    item.videoUrl ||
    item.video ||
    item.url ||
    ''

  const thumbnail =
    item.thumbnail_url ||
    item.thumbnailUrl ||
    item.thumbnail ||
    item.coverUrl ||
    ''

  const title = item.title || item.name || 'Untitled Short'
  const shortId = item.id || item.short_id

  const profile =
    item.profiles ||
    item.profile ||
    item.creator?.profiles ||
    item.creator ||
    {}

  const creatorId =
    item.user_id ||
    item.userId ||
    profile.id ||
    item.creator?.id ||
    item.user?.id ||
    null

  const creator =
    profile.username ||
    item.username ||
    item.user?.user_metadata?.username ||
    'Anime fan'

  const avatar =
    profile.avatar_url ||
    item.avatar_url ||
    item.avatarUrl ||
    item.user?.user_metadata?.avatar_url ||
    ''

  const youtubeId = getYouTubeVideoId(videoUrl)
  const isYouTube = Boolean(youtubeId)

  const youtubeEmbedUrl = isYouTube
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&controls=0&rel=0&enablejsapi=1&autoplay=${isActive ? 1 : 0}&mute=${muted ? 1 : 0}`
    : ''

  useEffect(() => {
    setLocalLiked(isLiked)
  }, [isLiked, shortId])

  useEffect(() => {
    setLocalLikes(
      Number(item.like_count ?? item.likeCount ?? item.likes ?? 0),
    )

    setLocalViews(
      Number(item.view_count ?? item.viewCount ?? item.views ?? 0),
    )
  }, [
    shortId,
    item.like_count,
    item.likeCount,
    item.likes,
    item.view_count,
    item.viewCount,
    item.views,
  ])

  // Reset player state when switching to a different video.
  useEffect(() => {
    setAspectRatio(9 / 16)
    setVideoError(false)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    viewRecordedRef.current = false
    playRequestRef.current = false
  }, [videoUrl])

  // Keep native videos muted consistently and play the active short.
  useEffect(() => {
    const element = videoRef.current

    if (element) {
      element.muted = muted

      if (!isActive) {
        element.pause()
        setPlaying(false)
        playRequestRef.current = false
        return
      }

      if (videoUrl && !isYouTube && !videoError) {
        playRequestRef.current = true

        element.play().catch((error) => {
          playRequestRef.current = false
          setPlaying(false)

          // Autoplay can be blocked by browser policy.
          if (error?.name !== 'AbortError') {
            console.info(
              'Autoplay was blocked. Use the play button to start the video.',
            )
          }
        })
      }
    }

    if (isYouTube && iframeRef.current) {
      if (!isActive) {
        sendYouTubeCommand(iframeRef.current, 'pauseVideo')
        setPlaying(false)
      } else {
        sendYouTubeCommand(
          iframeRef.current,
          muted ? 'mute' : 'unMute',
        )
      }
    }
  }, [isActive, videoUrl, isYouTube, videoError, muted])

  // Record a view once per card visit.
  const handleView = useCallback(() => {
    if (viewRecordedRef.current || !shortId) return

    viewRecordedRef.current = true
    setLocalViews((count) => count + 1)

    Promise.resolve(onView?.(shortId)).catch((error) => {
      console.error('Could not record Short view:', error)
    })
  }, [shortId, onView])

  const handleMetadata = (event) => {
    const element = event.currentTarget

    if (element.videoWidth > 0 && element.videoHeight > 0) {
      setAspectRatio(element.videoWidth / element.videoHeight)
    }

    setDuration(
      Number.isFinite(element.duration) ? element.duration : 0,
    )
  }

  const togglePlayback = async () => {
    if (isYouTube) {
      const iframe = iframeRef.current
      if (!iframe) return

      sendYouTubeCommand(
        iframe,
        playing ? 'pauseVideo' : 'playVideo',
      )

      if (playing) {
        setPlaying(false)
      } else {
        setPlaying(true)
      }

      return
    }

    const element = videoRef.current

    if (!element || !videoUrl || videoError) return

    if (element.paused) {
      try {
        playRequestRef.current = true
        await element.play()
      } catch {
        playRequestRef.current = false
        setPlaying(false)
      }
    } else {
      element.pause()
    }
  }

  const handleLike = async () => {
    if (!shortId || likeBusy) return

    const wasLiked = localLiked
    const nextLiked = !wasLiked

    setLikeBusy(true)
    setLocalLiked(nextLiked)
    setLocalLikes((count) =>
      Math.max(0, count + (nextLiked ? 1 : -1)),
    )

    try {
      if (nextLiked) {
        await onLike?.(shortId)
      } else {
        await onUnlike?.(shortId)
      }
    } catch (error) {
      setLocalLiked(wasLiked)
      setLocalLikes((count) =>
        Math.max(0, count + (wasLiked ? 1 : -1)),
      )

      console.error('Could not update Short like:', error)
    } finally {
      setLikeBusy(false)
    }
  }

  const handleVideoError = () => {
    setVideoError(true)
    setPlaying(false)
  }

  const handleTimeUpdate = (event) => {
    const element = event.currentTarget

    setCurrentTime(element.currentTime || 0)

    if (Number.isFinite(element.duration)) {
      setDuration(element.duration)
    }
  }

  const handleSeek = (event) => {
    const element = videoRef.current
    if (!element) return

    const nextTime = Number(event.target.value)

    element.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const handleDoubleClick = () => {
    setShowHeart(true)
    handleLike()

    window.setTimeout(() => setShowHeart(false), 650)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/shorts#short-${shortId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Watch ${title} on Anime Vault`,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setActionMessage('Link copied!')
        window.setTimeout(() => setActionMessage(''), 2000)
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setActionMessage('Could not share this short.')
        window.setTimeout(() => setActionMessage(''), 2000)
      }
    }
  }

  const CreatorAvatar = () => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-400/30 bg-purple-900/60 text-purple-200">
      {avatar ? (
        <img
          src={avatar}
          alt={`${creator}'s profile`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound size={18} />
      )}
    </span>
  )

  const safeRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0
      ? Math.min(Math.max(aspectRatio, 0.45), 2.2)
      : 9 / 16

  return (
    <article
      id={`short-${shortId}`}
      data-short-id={shortId}
      className={`relative mx-auto flex w-full max-w-[760px] items-center justify-center gap-3 sm:gap-5 ${className}`}
    >
      {/* VIDEO CARD */}
      <div
        className={`group relative min-w-0 overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-950 shadow-[0_0_35px_rgba(109,40,217,0.18)] ${
          isActive ? 'ring-1 ring-purple-400/40' : ''
        }`}
        style={{
          width: `min(100%, calc(68dvh * ${safeRatio}))`,
          aspectRatio: String(safeRatio),
          maxHeight: '68dvh',
          minHeight: '260px',
        }}
      >
        {/* Purple fills the empty space around the actual video. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-950 via-violet-950 to-purple-800" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.22),transparent_70%)]" />

        {/* Uploaded video files */}
        {!isYouTube && videoUrl && !videoError && (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnail || undefined}
            preload="metadata"
            playsInline
            loop
            muted={muted}
            controls={false}
            disablePictureInPicture
            onLoadedMetadata={handleMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => {
              setPlaying(true)
              handleView()
            }}
            onPause={() => setPlaying(false)}
            onEnded={(event) => {
              // Explicitly restart at the beginning.
              const element = event.currentTarget
              element.currentTime = 0
              setCurrentTime(0)

              if (isActive) {
                element.play().catch(() => setPlaying(false))
              }
            }}
            onError={handleVideoError}
            onDoubleClick={handleDoubleClick}
            aria-label={title}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer object-contain"
          />
        )}

        {/* YouTube video links need an embed URL, not a watch-page URL. */}
        {isYouTube && (
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl}
            title={title}
            className="absolute inset-0 z-10 h-full w-full border-0 bg-transparent"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => {
              if (isActive) {
                sendYouTubeCommand(
                  iframeRef.current,
                  muted ? 'mute' : 'unMute',
                )
              }
            }}
          />
        )}

        {/* Error state */}
        {(!videoUrl || videoError) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <Play size={38} className="text-purple-200" />
            <p className="text-sm text-purple-100">
              {videoError ? 'This video could not be played.' : 'No video available.'}
            </p>

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500"
              >
                Open video
              </a>
            )}
          </div>
        )}

        {/* Custom play/pause control for uploaded videos */}
        {!isYouTube && videoUrl && !videoError && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? 'Pause video' : 'Play video'}
            className={`absolute left-1/2 top-1/2 z-30 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-purple-950/75 text-white shadow-xl backdrop-blur-md transition ${
              playing
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-100'
            }`}
          >
            {playing ? (
              <Pause size={25} fill="currentColor" />
            ) : (
              <Play size={25} fill="currentColor" className="ml-1" />
            )}
          </button>
        )}

        {/* Sound button */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleMute?.()
          }}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          className="absolute right-3 top-3 z-40 rounded-full border border-white/15 bg-black/60 p-2.5 text-white backdrop-blur-md hover:bg-purple-700"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Top title */}
        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[65%] rounded-full border border-purple-300/20 bg-black/50 px-3 py-2 text-xs font-semibold text-purple-100 backdrop-blur-md">
          Anime Vault Shorts
        </div>

        {/* Creator and title overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 pb-7 pt-24">
          <h3 className="line-clamp-2 text-sm font-bold text-white sm:text-base">
            {title}
          </h3>

          {item.caption && (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/85 sm:text-sm">
              {item.caption}
            </p>
          )}
        </div>

        {/* Custom purple seek bar for uploaded videos */}
        {!isYouTube && !videoError && duration > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-50 h-1.5 bg-white/20">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={Math.min(currentTime, duration)}
              onChange={handleSeek}
              aria-label="Seek video"
              className="short-purple-progress absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
              style={{
                '--progress': `${(currentTime / duration) * 100}%`,
              }}
            />
          </div>
        )}

        {showHeart && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <Heart
              size={80}
              fill="currentColor"
              className="animate-ping text-pink-500 drop-shadow-xl"
            />
          </div>
        )}
      </div>

      {/* ACTION RAIL OUTSIDE THE VIDEO CARD */}
      <aside className="flex shrink-0 flex-col items-center gap-4 sm:gap-5">
        {/* Creator */}
        <Link
          to={creatorId ? `/profile/${creatorId}` : '#'}
          onClick={(event) => {
            if (!creatorId) event.preventDefault()
          }}
          aria-label={`View ${creator}'s profile`}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <CreatorAvatar />
        </Link>

        <span className="max-w-[64px] truncate text-center text-[10px] font-semibold text-purple-200">
          @{creator}
        </span>

        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={likeBusy}
          aria-label={localLiked ? 'Unlike Short' : 'Like Short'}
          aria-pressed={localLiked}
          className={`flex flex-col items-center gap-1 transition hover:scale-105 ${
            localLiked ? 'text-pink-400' : 'text-white hover:text-pink-300'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/20 bg-purple-950/70">
            {likeBusy ? (
              <LoaderCircle size={21} className="animate-spin" />
            ) : (
              <Heart
                size={22}
                fill={localLiked ? 'currentColor' : 'none'}
              />
            )}
          </span>
          <span className="text-[11px] font-semibold">
            {formatCount(localLikes)}
          </span>
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={() => onComments?.(shortId)}
          aria-label="Open comments"
          aria-expanded={commentsOpen}
          className={`flex flex-col items-center gap-1 transition hover:scale-105 ${
            commentsOpen
              ? 'text-purple-300'
              : 'text-white hover:text-purple-300'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/20 bg-purple-950/70">
            <MessageCircle size={22} />
          </span>
          <span className="text-[11px] font-semibold">
            {formatCount(item.comment_count ?? item.commentCount ?? 0)}
          </span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/20 bg-purple-950/70">
            <Eye size={21} />
          </span>
          <span className="text-[11px] font-semibold">
            {formatCount(localViews)}
          </span>
        </div>

        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share Short"
          className="flex flex-col items-center gap-1 text-white transition hover:scale-105 hover:text-purple-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/20 bg-purple-950/70">
            <Share2 size={20} />
          </span>
          <span className="text-[11px] font-semibold">Share</span>
        </button>

        {actionMessage && (
          <span className="max-w-[100px] text-center text-[10px] text-purple-200">
            {actionMessage}
          </span>
        )}

        {/* Navigation returns to the far right, outside the card. */}
        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous Short"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-700 text-white shadow-lg transition hover:bg-purple-600 active:scale-95"
          >
            <ChevronUp size={23} />
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next Short"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-700 text-white shadow-lg transition hover:bg-purple-600 active:scale-95"
          >
            <ChevronDown size={23} />
          </button>
        </div>
      </aside>

      <style>{`
        .short-purple-progress::-webkit-slider-runnable-track {
          height: 4px;
          background: linear-gradient(
            to right,
            #a855f7 0%,
            #a855f7 var(--progress),
            rgba(255,255,255,0.25) var(--progress),
            rgba(255,255,255,0.25) 100%
          );
        }

        .short-purple-progress::-moz-range-track {
          height: 4px;
          background: rgba(255,255,255,0.25);
        }

        .short-purple-progress::-moz-range-progress {
          height: 4px;
          background: #a855f7;
        }

        .short-purple-progress::-webkit-slider-thumb {
          appearance: none;
          width: 10px;
          height: 10px;
          margin-top: -3px;
          border-radius: 9999px;
          background: #e9d5ff;
          border: 1px solid #a855f7;
        }

        .short-purple-progress::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #e9d5ff;
          border: 1px solid #a855f7;
        }
      `}</style>
    </article>
  )
}