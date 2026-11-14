
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  Eye,
  Heart,
  UserRound,
  MessageCircle,
  LoaderCircle,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

function getYouTubeVideoId(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const parts = url.pathname.split('/').filter(Boolean)

    if (host === 'youtu.be') return parts[0] || null

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parts[0] === 'watch') return url.searchParams.get('v')
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

function getProfile(item) {
  const possibleProfile =
    item.creatorProfile ||
    item.profiles ||
    item.profile ||
    item.creator?.profiles ||
    item.creator ||
    {}

  return Array.isArray(possibleProfile)
    ? possibleProfile[0] || {}
    : possibleProfile
}

export default function ShortCard({
  short,
  video,
  className = '',
  isActive = false,
  isLiked = false,
  isSaved = false,
  onLike,
  onUnlike,
  onSave,
  onToggleMute,
  onComments,
  onNext,
  onPrevious,
  onView,
  commentsOpen = false,
  muted = true,
  canGoPrevious = true,
}) {
  const item = short || video || {}
  const profile = getProfile(item)

  const articleRef = useRef(null)
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const viewRecordedRef = useRef(false)
  const heartTimerRef = useRef(null)
  const playButtonTimerRef = useRef(null)

  const [aspectRatio, setAspectRatio] = useState(9 / 16)
  const [playing, setPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [compactActions, setCompactActions] = useState(false)
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localSaved, setLocalSaved] = useState(isSaved)
  const [localLikes, setLocalLikes] = useState(
    Number(item.like_count ?? item.likeCount ?? item.likes ?? 0),
  )
  const [localViews, setLocalViews] = useState(
    Number(item.view_count ?? item.viewCount ?? item.views ?? 0),
  )
  const [showHeart, setShowHeart] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [showPlayButton, setShowPlayButton] = useState(true)

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

  const creatorId =
    item.user_id ||
    item.userId ||
    profile.id ||
    item.creator?.id ||
    item.user?.id ||
    null

  const username =
    profile.username ||
    item.username ||
    item.user?.user_metadata?.username ||
    ''

  const displayName =
    profile.display_name ||
    profile.displayName ||
    item.display_name ||
    item.displayName ||
    item.user?.user_metadata?.display_name ||
    item.user?.user_metadata?.full_name ||
    username ||
    'Anime fan'

  const creatorLabel = username
    ? `@${username}`
    : displayName

  const avatar =
    profile.avatar_url ||
    profile.avatarUrl ||
    item.avatar_url ||
    item.avatarUrl ||
    item.user?.user_metadata?.avatar_url ||
    ''

  const channelLink = creatorId
    ? `/channel/${creatorId}`
    : null

  const youtubeId = getYouTubeVideoId(videoUrl)
  const isYouTube = Boolean(youtubeId)

  const youtubeEmbedUrl = isYouTube
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&controls=0&rel=0&enablejsapi=1&autoplay=${isActive ? 1 : 0}&mute=${muted ? 1 : 0}`
    : ''

  useEffect(() => {
    setLocalLiked(isLiked)
  }, [isLiked, shortId])

  useEffect(() => {
    setLocalSaved(isSaved)
  }, [isSaved, shortId])

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

  useEffect(() => {
    const element = articleRef.current
    if (!element) return

    const updateLayout = () => {
      setCompactActions(element.getBoundingClientRect().width < 600)
    }

    updateLayout()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateLayout)
      observer.observe(element)

      return () => observer.disconnect()
    }

    window.addEventListener('resize', updateLayout)

    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  useEffect(() => {
    setAspectRatio(9 / 16)
    setVideoError(false)
    setPlaying(false)
    setShowHeart(false)
    setShowPlayButton(true)
    viewRecordedRef.current = false
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) {
        window.clearTimeout(heartTimerRef.current)
      }

      if (playButtonTimerRef.current) {
        window.clearTimeout(playButtonTimerRef.current)
      }
    }
  }, [])

  const handleView = useCallback(() => {
    if (viewRecordedRef.current || !shortId) return

    viewRecordedRef.current = true
    setLocalViews((count) => count + 1)

    Promise.resolve(onView?.(shortId)).catch((error) => {
      console.error('Could not record Short view:', error)
    })
  }, [shortId, onView])

  const revealPlayButton = useCallback(() => {
    setShowPlayButton(true)

    if (playButtonTimerRef.current) {
      window.clearTimeout(playButtonTimerRef.current)
    }

    if (playing) {
      playButtonTimerRef.current = window.setTimeout(() => {
        setShowPlayButton(false)
      }, 1800)
    }
  }, [playing])

  useEffect(() => {
    const element = videoRef.current

    if (element) {
      element.muted = muted

      if (!isActive) {
        element.pause()
        setPlaying(false)
      } else if (videoUrl && !isYouTube && !videoError) {
        element.play().catch((error) => {
          setPlaying(false)

          if (error?.name !== 'AbortError') {
            console.info('Autoplay was blocked by the browser.')
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

        sendYouTubeCommand(iframeRef.current, 'playVideo')
        handleView()
      }
    }
  }, [isActive, videoUrl, isYouTube, videoError, muted, handleView])

  useEffect(() => {
    if (playing && isActive) {
      revealPlayButton()
    } else {
      setShowPlayButton(true)

      if (playButtonTimerRef.current) {
        window.clearTimeout(playButtonTimerRef.current)
      }
    }
  }, [playing, isActive, revealPlayButton])

  const handleMetadata = (event) => {
    const element = event.currentTarget

    if (element.videoWidth > 0 && element.videoHeight > 0) {
      setAspectRatio(element.videoWidth / element.videoHeight)
    }
  }

  const handleTogglePlayback = () => {
    if (!isActive) return

    revealPlayButton()

    if (isYouTube) {
      if (playing) {
        sendYouTubeCommand(iframeRef.current, 'pauseVideo')
        setPlaying(false)
      } else {
        sendYouTubeCommand(iframeRef.current, 'playVideo')
        setPlaying(true)
        handleView()
      }

      return
    }

    const element = videoRef.current
    if (!element) return

    if (element.paused) {
      element.play().catch((error) => {
        console.error('Could not play video:', error)
      })
    } else {
      element.pause()
    }
  }

  const handleFrameClick = (event) => {
    if (event.target.closest('button, a')) return
    handleTogglePlayback()
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
      const result = nextLiked
        ? await onLike?.(shortId)
        : await onUnlike?.(shortId)

      if (result?.success === false) {
        throw new Error(result.error || 'Could not update like.')
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

  const handleDoubleClick = () => {
    if (likeBusy) return

    setShowHeart(true)

    if (!localLiked) {
      handleLike()
    }

    if (heartTimerRef.current) {
      window.clearTimeout(heartTimerRef.current)
    }

    heartTimerRef.current = window.setTimeout(() => {
      setShowHeart(false)
    }, 650)
  }

  const handleSave = async () => {
    if (!shortId || saveBusy || localSaved) return

    if (!onSave) {
      setActionMessage('Save feature is not connected yet.')
      return
    }

    setSaveBusy(true)
    setActionMessage('')

    try {
      const result = await onSave(shortId)

      if (result?.success === false) {
        throw new Error(result.error || 'Could not save this Short.')
      }

      setLocalSaved(true)
      setActionMessage('Saved to My Vault!')
    } catch (error) {
      setActionMessage(error.message || 'Could not save this Short.')
      console.error('Could not save Short:', error)
    } finally {
      setSaveBusy(false)
    }
  }

  const handleVideoError = () => {
    setVideoError(true)
    setPlaying(false)
  }

  const CreatorAvatar = () => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-400/40 bg-purple-900 text-purple-200">
      {avatar ? (
        <img
          src={avatar}
          alt={`${displayName}'s profile`}
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

  const CreatorLink = ({ children, className = '', label }) => {
    if (!channelLink) {
      return (
        <span className={className} aria-label={label}>
          {children}
        </span>
      )
    }

    return (
      <Link
        to={channelLink}
        aria-label={label}
        className={className}
      >
        {children}
      </Link>
    )
  }

  const SocialActions = ({ inside = false }) => (
    <aside
      className={`flex shrink-0 items-center ${
        inside ? 'flex-col gap-3' : 'flex-col gap-4 sm:gap-5'
      }`}
    >
      {!inside && (
        <>
          <CreatorLink
            label={`View ${displayName}'s channel`}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <CreatorAvatar />
          </CreatorLink>

          <span className="max-w-[90px] truncate text-center text-[10px] font-semibold text-purple-200">
            {creatorLabel}
          </span>
        </>
      )}

      <button
        type="button"
        onClick={handleLike}
        disabled={likeBusy}
        aria-label={localLiked ? 'Unlike Short' : 'Like Short'}
        aria-pressed={localLiked}
        className={`flex flex-col items-center gap-1 transition hover:scale-105 ${
          localLiked
            ? 'text-pink-400'
            : 'text-white hover:text-pink-300'
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-950/90">
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
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-950/90">
          <MessageCircle size={22} />
        </span>

        <span className="text-[11px] font-semibold">
          {formatCount(
            item.comment_count ?? item.commentCount ?? 0,
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={saveBusy || localSaved}
        aria-label={localSaved ? 'Saved to My Vault' : 'Save to My Vault'}
        aria-pressed={localSaved}
        className={`flex flex-col items-center gap-1 transition hover:scale-105 ${
          localSaved
            ? 'text-purple-300'
            : 'text-white hover:text-purple-300'
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-950/90">
          {saveBusy ? (
            <LoaderCircle size={21} className="animate-spin" />
          ) : localSaved ? (
            <BookmarkCheck size={22} />
          ) : (
            <Bookmark size={22} />
          )}
        </span>

        <span className="text-[11px] font-semibold">
          {saveBusy ? 'Saving' : localSaved ? 'Saved' : 'Save'}
        </span>
      </button>

      <div className="flex flex-col items-center gap-1 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-950/90">
          <Eye size={21} />
        </span>

        <span className="text-[11px] font-semibold">
          {formatCount(localViews)}
        </span>
      </div>
    </aside>
  )

  const NavigationActions = ({ inside = false }) => (
    <aside
      className={`shorts-navigation-actions flex shrink-0 flex-col items-center ${
        inside ? 'gap-3' : 'gap-4 sm:gap-5'
      }`}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous Short"
        title="Previous Short"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-transparent text-white transition hover:scale-105 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp size={22} />
      </button>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next Short"
        title="Next Short"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-transparent text-white transition hover:scale-105 hover:bg-white/10"
      >
        <ChevronDown size={22} />
      </button>
    </aside>
  )

  const safeRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0
      ? Math.min(Math.max(aspectRatio, 0.45), 2.2)
      : 9 / 16

  return (
    <article
      ref={articleRef}
      id={`short-${shortId}`}
      data-short-id={shortId}
      className={`relative mx-auto flex w-full max-w-[760px] items-center justify-center gap-3 bg-transparent sm:gap-5 ${className}`}
    >
      <div
        onClick={handleFrameClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={revealPlayButton}
        onTouchStart={revealPlayButton}
        className="group relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-950 via-violet-950 to-purple-900 ring-1 ring-inset ring-purple-400/10"
        style={{
          width: `min(100%, calc(78dvh * ${safeRatio}))`,
          aspectRatio: String(safeRatio),
          minHeight: 'min(300px, 55dvh)',
          maxHeight: '78dvh',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.18),transparent_70%)]" />

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
            onPlay={() => {
              setPlaying(true)
              handleView()
            }}
            onPause={() => setPlaying(false)}
            onError={handleVideoError}
            aria-label={title}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer object-contain"
          />
        )}

        {isYouTube && (
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl}
            title={title}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full border-0 bg-transparent"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            onLoad={() => {
              if (isActive) {
                sendYouTubeCommand(
                  iframeRef.current,
                  muted ? 'mute' : 'unMute',
                )
                sendYouTubeCommand(iframeRef.current, 'playVideo')
                handleView()
              }
            }}
          />
        )}

        {(!videoUrl || videoError) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <Play size={38} className="text-purple-200" />

            <p className="text-sm text-purple-100">
              {videoError
                ? 'This video could not be played.'
                : 'No video available.'}
            </p>

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500"
              >
                Open video
              </a>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[75%] rounded-full border border-purple-300/20 bg-black/50 px-3 py-2 text-xs font-semibold text-purple-100 backdrop-blur-md">
          Anime Vault Shorts
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleMute?.()
          }}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          aria-pressed={!muted}
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-purple-700"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {videoUrl && !videoError && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleTogglePlayback()
            }}
            aria-label={playing ? 'Pause video' : 'Play video'}
            aria-pressed={playing}
            className={`absolute left-1/2 top-1/2 z-30 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-purple-700 ${
              showPlayButton
                ? 'scale-100 opacity-100'
                : 'pointer-events-none scale-90 opacity-0'
            }`}
          >
            {playing ? (
              <Pause size={27} fill="currentColor" />
            ) : (
              <Play size={27} fill="currentColor" className="ml-1" />
            )}
          </button>
        )}

        {compactActions && (
          <div
            className="absolute right-2 top-16 z-30 flex items-start gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <SocialActions inside />
            <NavigationActions inside />
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/65 to-transparent p-4 pb-5 pt-28"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-auto mb-3 flex min-w-0 items-center gap-2">
            <CreatorLink
              label={`View ${displayName}'s channel`}
              className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <CreatorAvatar />
            </CreatorLink>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                {displayName}
              </p>

              <p className="truncate text-[10px] text-purple-200">
                {creatorLabel}
              </p>
            </div>
          </div>

          <h3 className="line-clamp-2 text-sm font-bold text-white sm:text-base">
            {title}
          </h3>

          {item.caption && (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/85 sm:text-sm">
              {item.caption}
            </p>
          )}

          {actionMessage && (
            <p className="mt-2 text-[10px] font-medium text-purple-200">
              {actionMessage}
            </p>
          )}
        </div>

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

      {!compactActions && (
        <>
          <SocialActions />
          <NavigationActions />
        </>
      )}

      <style>{`
        @media (max-width: 760px) {
          .shorts-navigation-actions {
            display: none !important;
          }
        }
      `}</style>
    </article>
  )
}
