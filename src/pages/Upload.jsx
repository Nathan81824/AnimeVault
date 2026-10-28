import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Upload as UploadIcon,
  Link2,
  ImagePlus,
  Music2,
  Play,
  Pause,
  X,
  Clock3,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Film,
  Volume2,
  ExternalLink,
} from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'
import { useShortStore } from '../features/shorts/shortsStore'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const MAX_AUDIO_SIZE = 50 * 1024 * 1024
const MAX_IMAGES = 30

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/x-wav',
]

function parseHttpUrl(value) {
  if (!value?.trim()) return null

  try {
    const input = value.trim()
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    )

    if (!['https:', 'http:'].includes(url.protocol)) return null
    if (!url.hostname.includes('.')) return null
    if (url.username || url.password) return null

    return url
  } catch {
    return null
  }
}

function getVideoSource(value) {
  const url = parseHttpUrl(value)

  if (!url) {
    return {
      valid: false,
      platform: null,
      embedUrl: null,
      canonicalUrl: null,
    }
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname
  const parts = path.split('/').filter(Boolean)

  if (
    ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ||
    host === 'youtu.be'
  ) {
    let videoId = null

    if (host === 'youtu.be') {
      videoId = parts[0]
    } else if (
      ['shorts', 'embed', 'live'].includes(parts[0])
    ) {
      videoId = parts[1]
    } else if (path === '/watch') {
      videoId = url.searchParams.get('v')
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return {
        valid: true,
        platform: 'YouTube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`,
        canonicalUrl: url.href,
      }
    }
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const videoId = path.match(/\/video\/(\d+)/)?.[1]

    if (videoId) {
      return {
        valid: true,
        platform: 'TikTok',
        embedUrl: `https://www.tiktok.com/player/v1/${videoId}?description=0&music_info=0`,
        canonicalUrl: url.href,
      }
    }

    return {
      valid: true,
      platform: 'TikTok',
      embedUrl: null,
      canonicalUrl: url.href,
    }
  }

  if (
    host === 'instagram.com' ||
    host.endsWith('.instagram.com')
  ) {
    const match = path.match(/^\/(reel|reels|p|tv)\/([^/]+)/)

    return {
      valid: true,
      platform: 'Instagram',
      embedUrl: match
        ? `https://www.instagram.com/${match[1]}/${match[2]}/embed`
        : null,
      canonicalUrl: url.href,
    }
  }

  if (
    host === 'facebook.com' ||
    host.endsWith('.facebook.com') ||
    host === 'fb.watch'
  ) {
    return {
      valid: true,
      platform: 'Facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false`,
      canonicalUrl: url.href,
    }
  }

  if (
    host === 'x.com' ||
    host === 'twitter.com' ||
    host.endsWith('.x.com') ||
    host.endsWith('.twitter.com')
  ) {
    return {
      valid: true,
      platform: 'X',
      embedUrl: null,
      canonicalUrl: url.href,
    }
  }

  if (
    /\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)
  ) {
    return {
      valid: true,
      platform: 'Direct video',
      embedUrl: null,
      canonicalUrl: url.href,
    }
  }

  return {
    valid: true,
    platform: 'External link',
    embedUrl: null,
    canonicalUrl: url.href,
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const remainingSeconds = total % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    const media = document.createElement(
      file.type.startsWith('audio/') ? 'audio' : 'video',
    )

    const objectUrl = URL.createObjectURL(file)
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      media.removeAttribute('src')
      media.load()
    }

    media.preload = 'metadata'

    media.onloadedmetadata = () => {
      if (settled) return
      settled = true

      const duration = media.duration
      cleanup()

      if (!Number.isFinite(duration)) {
        reject(new Error('Unable to read the media duration.'))
        return
      }

      resolve(duration)
    }

    media.onerror = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('Unable to read this media file.'))
    }

    media.src = objectUrl
  })
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Upload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const user = useAuthStore((state) => state.user)

  const createShort = useShortStore((state) => state.createShort)
  const createShortFromLink = useShortStore(
    (state) => state.createShortFromLink,
  )
  const createShortFromMedia = useShortStore(
    (state) => state.createShortFromMedia,
  )

  const isUploading = useShortStore((state) => state.isUploading)
  const storeError = useShortStore((state) => state.error)
  const storeMessage = useShortStore((state) => state.message)
  const clearMessages = useShortStore((state) => state.clearMessages)

  const [mode, setMode] = useState(
    searchParams.get('type') === 'short' ? 'video' : 'video',
  )

  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [publishImmediately, setPublishImmediately] = useState(true)

  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)

  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState(null)

  const [images, setImages] = useState([])
  const [imageDurations, setImageDurations] = useState([])

  const [audioFile, setAudioFile] = useState(null)
  const [audioPreview, setAudioPreview] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)

  const [totalDuration, setTotalDuration] = useState(30)

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [localError, setLocalError] = useState('')
  const [localMessage, setLocalMessage] = useState('')

  const videoInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const previewVideoRef = useRef(null)
  const previewAudioRef = useRef(null)

  const objectUrlsRef = useRef(new Set())

  const createObjectUrl = (file) => {
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.add(url)
    return url
  }

  const releaseObjectUrl = (url) => {
    if (!url || !objectUrlsRef.current.has(url)) return

    URL.revokeObjectURL(url)
    objectUrlsRef.current.delete(url)
  }

  const activeError = localError || storeError
  const activeMessage = localMessage || storeMessage

  useEffect(() => {
    clearMessages()

    return () => {
      clearMessages()
    }
  }, [clearMessages])

  useEffect(() => {
    if (!user) {
      navigate('/login', {
        replace: true,
        state: {
          from: {
            pathname: '/upload',
            search: window.location.search,
          },
        },
      })
    }
  }, [user, navigate])

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrlsRef.current.clear()
    }
  }, [])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setLocalError('')
    setLocalMessage('')
    clearMessages()
    setIsPreviewPlaying(false)

    if (previewVideoRef.current) {
      previewVideoRef.current.pause()
      previewVideoRef.current.currentTime = 0
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
    }
  }

  const handleVideoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!VIDEO_TYPES.includes(file.type)) {
      setLocalError('Choose an MP4, WebM, or MOV video file.')
      return
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setLocalError('The video must be smaller than 500 MB.')
      return
    }

    setLocalError('')
    setLocalMessage('')
    setVideoDuration(null)
    setIsPreviewPlaying(false)

    if (previewVideoRef.current) {
      previewVideoRef.current.pause()
    }

    const nextPreview = createObjectUrl(file)

    setVideoFile(file)
    setVideoPreview((previous) => {
      releaseObjectUrl(previous)
      return nextPreview
    })

    try {
      const duration = await getMediaDuration(file)
      setVideoDuration(duration)
    } catch (error) {
      setLocalError(error.message || 'Unable to read this video.')
    }
  }

  const removeVideo = () => {
    previewVideoRef.current?.pause()
    setVideoFile(null)

    setVideoPreview((previous) => {
      releaseObjectUrl(previous)
      return null
    })

    setVideoDuration(null)
    setIsPreviewPlaying(false)
  }

  const handleImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return

    if (images.length + files.length > MAX_IMAGES) {
      setLocalError(`You can use no more than ${MAX_IMAGES} pictures.`)
      return
    }

    const invalid = files.find(
      (file) =>
        !IMAGE_TYPES.includes(file.type) ||
        file.size > MAX_IMAGE_SIZE,
    )

    if (invalid) {
      setLocalError(
        'Use JPG, PNG, WebP, or GIF pictures smaller than 15 MB each.',
      )
      return
    }

    setLocalError('')
    setLocalMessage('')

    const additions = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      preview: createObjectUrl(file),
    }))

    setImages((previous) => [...previous, ...additions])
    setImageDurations((previous) => [
      ...previous,
      ...additions.map(() => 3),
    ])
  }

  const removeImage = (index) => {
    const image = images[index]
    releaseObjectUrl(image?.preview)

    setImages((previous) =>
      previous.filter((_, imageIndex) => imageIndex !== index),
    )

    setImageDurations((previous) =>
      previous.filter((_, durationIndex) => durationIndex !== index),
    )
  }

  const moveImage = (index, direction) => {
    const target = index + direction

    if (target < 0 || target >= images.length) return

    setImages((previous) => {
      const updated = [...previous]
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      return updated
    })

    setImageDurations((previous) => {
      const updated = [...previous]
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      return updated
    })
  }

  const handleAudioChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!AUDIO_TYPES.includes(file.type)) {
      setLocalError('Choose a supported audio file such as MP3, WAV, or OGG.')
      return
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setLocalError('The audio file must be smaller than 50 MB.')
      return
    }

    setLocalError('')
    setLocalMessage('')

    const nextPreview = createObjectUrl(file)

    setAudioFile(file)
    setAudioPreview((previous) => {
      releaseObjectUrl(previous)
      return nextPreview
    })

    try {
      const duration = await getMediaDuration(file)
      setAudioDuration(duration)
    } catch (error) {
      setLocalError(error.message || 'Unable to read this audio file.')
    }
  }

  const removeAudio = () => {
    previewAudioRef.current?.pause()
    setAudioFile(null)

    setAudioPreview((previous) => {
      releaseObjectUrl(previous)
      return null
    })

    setAudioDuration(null)
  }

  const handleVideoUrlChange = (value) => {
    setVideoUrl(value)
    setVideoSource(getVideoSource(value))
    setLocalError('')
    setLocalMessage('')
  }

  const togglePreview = async () => {
    if (mode === 'video') {
      const video = previewVideoRef.current

      if (!video) return

      if (video.paused) {
        try {
          await video.play()
          setIsPreviewPlaying(true)
        } catch {
          setLocalError('Unable to play this video preview.')
        }
      } else {
        video.pause()
        setIsPreviewPlaying(false)
      }

      return
    }

    if (mode === 'link') {
      setLocalMessage(
        'Some platforms restrict embedded playback. If the preview is unavailable, open the original link.',
      )
      return
    }

    setLocalMessage(
      'A finished picture-and-music video requires a video-rendering service. This form can collect the media, but the service must render it.',
    )
  }

  const validateCommonFields = () => {
    if (!title.trim()) return 'Please enter a title for your Short.'
    if (title.trim().length > 120) return 'Keep the title under 120 characters.'
    if (caption.trim().length > 2200) return 'Keep the caption under 2,200 characters.'
    return null
  }

  const handlePublish = async (event) => {
    event.preventDefault()

    if (isUploading) return

    setLocalError('')
    setLocalMessage('')
    clearMessages()

    const commonError = validateCommonFields()

    if (commonError) {
      setLocalError(commonError)
      return
    }

    if (!user) {
      navigate('/login')
      return
    }

    try {
      let result

      if (mode === 'video') {
        if (!videoFile) {
          setLocalError('Choose a video before publishing.')
          return
        }

        result = await createShort({
          file: videoFile,
          title: title.trim(),
          caption: caption.trim(),
          duration: videoDuration,
          publish: publishImmediately,
        })
      } else if (mode === 'link') {
        const source = getVideoSource(videoUrl)

        if (!source.valid) {
          setLocalError('Paste a valid http or https video link.')
          return
        }

        result = await createShortFromLink({
          url: source.canonicalUrl,
          videoUrl: source.canonicalUrl,
          title: title.trim(),
          caption: caption.trim(),
          publish: publishImmediately,
        })
      } else {
        if (images.length === 0) {
          setLocalError('Add at least one picture.')
          return
        }

        const sumOfImageDurations = imageDurations.reduce(
          (sum, duration) => sum + Number(duration || 0),
          0,
        )

        if (sumOfImageDurations > totalDuration) {
          setLocalError(
            'The combined picture durations cannot exceed the total video duration.',
          )
          return
        }

        result = await createShortFromMedia({
          images: images.map((image) => image.file),
          audioFile,
          title: title.trim(),
          caption: caption.trim(),
          duration: totalDuration,
          imageDurations,
          publish: publishImmediately,
        })
      }

      if (!result?.success) {
        setLocalError(result?.error || 'Your Short could not be saved.')
        return
      }

      navigate('/shorts', {
        replace: true,
        state: {
          message: publishImmediately
            ? 'Your Short has been published!'
            : 'Your Short has been saved as a draft.',
        },
      })
    } catch (error) {
      setLocalError(error?.message || 'Something went wrong while saving.')
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vault-bg text-vault-muted">
        <LoaderCircle size={30} className="animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'video', label: 'Upload video', icon: UploadIcon },
    { id: 'link', label: 'Video link', icon: Link2 },
    { id: 'media', label: 'Pictures + music', icon: ImagePlus },
  ]

  const inputClass =
    'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-vault-accent'

  const labelClass = 'text-sm font-semibold text-white'

  const sumOfImageDurations = imageDurations.reduce(
    (sum, duration) => sum + Number(duration || 0),
    0,
  )

  return (
    <main className="min-h-screen bg-vault-bg px-4 py-6 text-vault-text sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/shorts"
          className="mb-6 inline-flex items-center gap-2 text-sm text-vault-muted transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Shorts
        </Link>

        <div className="mb-7">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vault-purple/20 text-vault-accent">
              <Film size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                Create a <span className="text-vault-accent">Short</span>
              </h1>
              <p className="mt-1 text-sm text-vault-muted">
                Make something worth watching.
              </p>
            </div>
          </div>
        </div>

        {activeError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {activeMessage && !activeError && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span>{activeMessage}</span>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-vault-surface p-4 sm:p-6">
            <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchMode(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    mode === id
                      ? 'border-vault-accent/50 bg-vault-purple/20 text-white'
                      : 'border-white/10 text-vault-muted hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePublish} className="space-y-6">
              {mode === 'video' && (
                <div>
                  <label className={labelClass}>Video file</label>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoChange}
                    className="hidden"
                  />

                  {!videoFile ? (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="mt-2 flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-black/10 p-6 text-center transition hover:border-vault-accent/60 hover:bg-vault-purple/10"
                    >
                      <UploadIcon size={34} className="mb-3 text-vault-accent" />
                      <span className="font-bold">Choose a video</span>
                      <span className="mt-2 text-xs text-vault-muted">
                        MP4, WebM, or MOV · Up to 500 MB
                      </span>
                    </button>
                  ) : (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                      <video
                        src={videoPreview}
                        controls
                        playsInline
                        className="max-h-[500px] w-full bg-black object-contain"
                      />

                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {videoFile.name}
                          </p>
                          <p className="mt-1 text-xs text-vault-muted">
                            {formatFileSize(videoFile.size)}
                            {videoDuration != null && ` · ${formatDuration(videoDuration)}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={removeVideo}
                          className="rounded-lg p-2 text-vault-muted hover:bg-white/10 hover:text-white"
                          aria-label="Remove video"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'link' && (
                <div>
                  <label htmlFor="video-url" className={labelClass}>
                    External video link
                  </label>

                  <div className="relative mt-2">
                    <Link2
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted"
                    />

                    <input
                      id="video-url"
                      type="url"
                      value={videoUrl}
                      onChange={(event) => handleVideoUrlChange(event.target.value)}
                      placeholder="Paste a YouTube, TikTok, Instagram, Facebook, or video URL"
                      className={`${inputClass} pl-10`}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-vault-muted">
                    Links are saved as references. Whether the video plays inside Anime Vault depends on the platform and its embed permissions.
                  </p>

                  {videoSource?.valid && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
                      {videoSource.embedUrl ? (
                        <iframe
                          src={videoSource.embedUrl}
                          title={`${videoSource.platform} video preview`}
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="aspect-[9/16] max-h-[520px] w-full border-0"
                          loading="lazy"
                          allowFullScreen
                        />
                      ) : videoSource.platform === 'Direct video' ? (
                        <video
                          src={videoSource.canonicalUrl}
                          controls
                          playsInline
                          className="aspect-[9/16] max-h-[520px] w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                          <ExternalLink size={28} className="text-vault-accent" />
                          <p className="text-sm font-semibold">
                            {videoSource.platform} link detected
                          </p>
                          <p className="text-xs leading-5 text-vault-muted">
                            This link may not support an embedded preview. You can still save it and open the original source.
                          </p>
                          <a
                            href={videoSource.canonicalUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-lg bg-vault-purple px-4 py-2 text-sm font-semibold text-white hover:bg-vault-purple/80"
                          >
                            Open original video <ExternalLink size={15} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'media' && (
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Pictures</label>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="mt-2 flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 p-5 text-center transition hover:border-vault-accent/60 hover:bg-vault-purple/10"
                    >
                      <ImagePlus size={30} className="mb-2 text-vault-accent" />
                      <span className="text-sm font-bold">Add pictures</span>
                      <span className="mt-1 text-xs text-vault-muted">
                        JPG, PNG, WebP, or GIF · Up to {MAX_IMAGES} pictures
                      </span>
                    </button>

                    {images.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {images.map((image, index) => (
                          <div
                            key={image.id}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
                          >
                            <img
                              src={image.preview}
                              alt={`Picture ${index + 1}`}
                              className="h-16 w-14 rounded-lg object-cover"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {image.file.name}
                              </p>

                              <label className="mt-2 flex items-center gap-2 text-xs text-vault-muted">
                                Duration
                                <select
                                  value={imageDurations[index] ?? 3}
                                  onChange={(event) =>
                                    setImageDurations((previous) =>
                                      previous.map((duration, durationIndex) =>
                                        durationIndex === index
                                          ? Number(event.target.value)
                                          : duration,
                                      ),
                                    )
                                  }
                                  className="rounded-lg border border-white/10 bg-vault-bg px-2 py-1 text-white"
                                >
                                  {[1, 2, 3, 4, 5, 6, 8, 10].map((seconds) => (
                                    <option key={seconds} value={seconds}>
                                      {seconds}s
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => moveImage(index, -1)}
                                disabled={index === 0}
                                className="rounded p-1 text-xs text-vault-muted hover:text-white disabled:opacity-30"
                                aria-label="Move picture earlier"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() => moveImage(index, 1)}
                                disabled={index === images.length - 1}
                                className="rounded p-1 text-xs text-vault-muted hover:text-white disabled:opacity-30"
                                aria-label="Move picture later"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="rounded p-1 text-red-300 hover:bg-red-500/10"
                                aria-label="Remove picture"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-vault-muted">
                      Picture durations total {sumOfImageDurations} seconds.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Background music</label>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/webm,audio/x-wav"
                      onChange={handleAudioChange}
                      className="hidden"
                    />

                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 p-4">
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vault-purple/20 text-vault-accent">
                          <Music2 size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {audioFile?.name || 'Choose an audio file'}
                          </p>
                          <p className="mt-1 text-xs text-vault-muted">
                            {audioFile
                              ? `${formatFileSize(audioFile.size)}${audioDuration != null ? ` · ${formatDuration(audioDuration)}` : ''}`
                              : 'MP3, WAV, OGG, AAC · Up to 50 MB'}
                          </p>
                        </div>
                      </button>

                      {audioFile && (
                        <button
                          type="button"
                          onClick={removeAudio}
                          aria-label="Remove audio"
                          className="shrink-0 rounded-lg p-2 text-vault-muted hover:bg-white/10 hover:text-white"
                        >
                          <X size={17} />
                        </button>
                      )}
                    </div>

                    {audioPreview && (
                      <audio
                        ref={previewAudioRef}
                        src={audioPreview}
                        controls
                        className="mt-3 w-full"
                      />
                    )}

                    <p className="mt-2 text-xs leading-5 text-vault-muted">
                      Use audio you own or have permission to use.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="total-duration" className={labelClass}>
                      Total video duration
                    </label>

                    <div className="mt-2 flex items-center gap-3">
                      <Clock3 size={18} className="text-vault-accent" />
                      <select
                        id="total-duration"
                        value={totalDuration}
                        onChange={(event) => setTotalDuration(Number(event.target.value))}
                        className={inputClass}
                      >
                        {[15, 30, 45, 60].map((seconds) => (
                          <option key={seconds} value={seconds}>
                            {seconds} seconds
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="mt-2 text-xs text-vault-muted">
                      The combined picture durations must not exceed {totalDuration} seconds.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="short-title" className={labelClass}>
                  Title
                </label>

                <input
                  id="short-title"
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Give your Short a title"
                  className={inputClass}
                />

                <p className="mt-1 text-right text-xs text-vault-muted">
                  {title.length}/120
                </p>
              </div>

              <div>
                <label htmlFor="short-caption" className={labelClass}>
                  Caption
                </label>

                <textarea
                  id="short-caption"
                  rows={4}
                  maxLength={2200}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Tell everyone about your Short..."
                  className={`${inputClass} resize-y`}
                />

                <p className="mt-1 text-right text-xs text-vault-muted">
                  {caption.length}/2200
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(event) => setPublishImmediately(event.target.checked)}
                  className="mt-1 accent-violet-500"
                />

                <span>
                  <span className="block text-sm font-semibold">
                    Publish immediately
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-vault-muted">
                    Turn this off to save a draft instead. Your service must support draft status.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={isUploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-vault-purple px-5 py-3.5 text-sm font-bold text-white transition hover:bg-vault-purple/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Saving your Short...
                  </>
                ) : (
                  <>
                    {publishImmediately ? <UploadIcon size={18} /> : <CheckCircle2 size={18} />}
                    {publishImmediately ? 'Publish Short' : 'Save draft'}
                  </>
                )}
              </button>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-vault-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <Play size={19} className="text-vault-accent" />
                <h2 className="font-bold">Preview</h2>
              </div>

              <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black">
                {mode === 'video' && videoPreview ? (
                  <>
                    <video
                      ref={previewVideoRef}
                      src={videoPreview}
                      muted
                      playsInline
                      onPlay={() => setIsPreviewPlaying(true)}
                      onPause={() => setIsPreviewPlaying(false)}
                      onEnded={() => setIsPreviewPlaying(false)}
                      className="h-full w-full object-contain"
                    />

                    <button
                      type="button"
                      onClick={togglePreview}
                      className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
                    >
                      {isPreviewPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                  </>
                ) : mode === 'link' && videoSource?.valid ? (
                  videoSource.embedUrl ? (
                    <iframe
                      src={videoSource.embedUrl}
                      title={`${videoSource.platform} Short preview`}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="h-full w-full border-0"
                      loading="lazy"
                      allowFullScreen
                    />
                  ) : videoSource.platform === 'Direct video' ? (
                    <video
                      src={videoSource.canonicalUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-5 text-center text-vault-muted">
                      <ExternalLink size={30} className="mb-3 text-vault-accent" />
                      <p className="text-sm font-semibold">
                        {videoSource.platform} preview
                      </p>
                      <a
                        href={videoSource.canonicalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-vault-purple px-4 py-2 text-sm font-semibold text-white"
                      >
                        Open video <ExternalLink size={14} />
                      </a>
                    </div>
                  )
                ) : mode === 'media' && images.length > 0 ? (
                  <img
                    src={images[0].preview}
                    alt="First picture in your video"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-5 text-center text-vault-muted">
                    <Film size={35} className="mb-3 opacity-50" />
                    <p className="text-sm font-semibold">Your Short preview</p>
                    <p className="mt-2 text-xs leading-5">
                      Choose a video, paste a link, or add pictures.
                    </p>
                  </div>
                )}

                {(title || caption) && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                    <p className="line-clamp-2 text-sm font-bold text-white">
                      {title || 'Your Short title'}
                    </p>
                    {caption && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/80">
                        {caption}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-vault-muted">
                <Volume2 size={14} />
                <span>
                  {mode === 'video' && videoDuration != null
                    ? `Duration: ${formatDuration(videoDuration)}`
                    : mode === 'media'
                      ? `${totalDuration} seconds`
                      : mode === 'link' && videoSource?.valid
                        ? `${videoSource.platform} preview`
                        : 'Waiting for media'}
                </span>
              </div>

              {mode === 'media' && audioFile && (
                <p className="mt-2 truncate text-center text-xs text-vault-muted">
                  Music: {audioFile.name}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-vault-surface p-5">
              <h3 className="font-bold">Creator tips</h3>
              <ul className="mt-3 space-y-3 text-sm leading-5 text-vault-muted">
                <li>• Use a clear title and caption.</li>
                <li>• Preview your video before publishing.</li>
                <li>• Only share videos and music you have permission to use.</li>
                <li>• Some platforms block embedded playback or require sign-in.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}