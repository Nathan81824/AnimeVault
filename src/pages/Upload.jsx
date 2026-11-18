
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload as UploadIcon,
  Link2,
  ImagePlus,
  Music2,
  Film,
  X,
  Clock3,
  LoaderCircle,
  AlertCircle,
  CalendarClock,
  Save,
  Send,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'
import shortService from '../features/shorts/services/shortsService'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const MAX_AUDIO_SIZE = 50 * 1024 * 1024
const MAX_IMAGES = 30

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
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
    const url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    )

    if (!['http:', 'https:'].includes(url.protocol)) return null
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
  const parts = url.pathname.split('/').filter(Boolean)

  if (
    host === 'youtu.be' ||
    host.endsWith('youtube.com') ||
    host === 'youtube-nocookie.com'
  ) {
    let id = null

    if (host === 'youtu.be') id = parts[0]
    else if (['shorts', 'embed', 'live'].includes(parts[0])) id = parts[1]
    else if (url.pathname === '/watch') id = url.searchParams.get('v')

    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return {
        valid: true,
        platform: 'YouTube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
        canonicalUrl: url.href,
      }
    }
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1]

    return {
      valid: true,
      platform: 'TikTok',
      embedUrl: id ? `https://www.tiktok.com/player/v1/${id}` : null,
      canonicalUrl: url.href,
    }
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([^/]+)/)

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
    host.endsWith('.x.com') ||
    host === 'twitter.com' ||
    host.endsWith('.twitter.com')
  ) {
    return {
      valid: true,
      platform: 'X',
      embedUrl: null,
      canonicalUrl: url.href,
    }
  }

  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)) {
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
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    const media = document.createElement(
      file.type.startsWith('audio/') ? 'audio' : 'video',
    )

    const url = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(url)
      media.removeAttribute('src')
      media.load()
    }

    media.preload = 'metadata'

    media.onloadedmetadata = () => {
      const duration = media.duration
      cleanup()

      if (!Number.isFinite(duration)) {
        reject(new Error('Unable to read media duration.'))
        return
      }

      resolve(duration)
    }

    media.onerror = () => {
      cleanup()
      reject(new Error('Unable to read this media file.'))
    }

    media.src = url
  })
}

function getMinimumDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000)
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function Upload() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [mode, setMode] = useState('video')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')

  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState('')
  const [videoDuration, setVideoDuration] = useState(null)

  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState(null)

  const [images, setImages] = useState([])
  const [imageDurations, setImageDurations] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [audioPreview, setAudioPreview] = useState('')
  const [audioDuration, setAudioDuration] = useState(null)
  const [totalDuration, setTotalDuration] = useState(30)

  const [scheduledAt, setScheduledAt] = useState('')
  const [localError, setLocalError] = useState('')
  const [action, setAction] = useState('')

  const videoInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const objectUrlsRef = useRef(new Set())

  const busy = Boolean(action)

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

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrlsRef.current.clear()
    }
  }, [])

  const switchMode = (nextMode) => {
    if (busy) return

    setMode(nextMode)
    setLocalError('')
  }

  const handleVideoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!VIDEO_TYPES.includes(file.type)) {
      setLocalError('Choose an MP4, WebM, or MOV video.')
      return
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setLocalError('Your video must be smaller than 100 MB.')
      return
    }

    setLocalError('')
    setVideoDuration(null)

    const nextPreview = createObjectUrl(file)

    setVideoFile(file)

    setVideoPreview((previous) => {
      releaseObjectUrl(previous)
      return nextPreview
    })

    try {
      const duration = await getMediaDuration(file)
      setVideoDuration(duration)
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const removeVideo = () => {
    setVideoFile(null)

    setVideoPreview((previous) => {
      releaseObjectUrl(previous)
      return ''
    })

    setVideoDuration(null)
  }

  const handleVideoUrlChange = (value) => {
    setVideoUrl(value)
    setVideoSource(getVideoSource(value))
    setLocalError('')
  }

  const handleImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return

    if (images.length + files.length > MAX_IMAGES) {
      setLocalError(`You can only add ${MAX_IMAGES} pictures.`)
      return
    }

    const invalid = files.find(
      (file) =>
        !IMAGE_TYPES.includes(file.type) ||
        file.size > MAX_IMAGE_SIZE,
    )

    if (invalid) {
      setLocalError('Use JPG, PNG, WebP, or GIF pictures under 15 MB each.')
      return
    }

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

    setLocalError('')
  }

  const removeImage = (index) => {
    releaseObjectUrl(images[index]?.preview)

    setImages((previous) => previous.filter((_, i) => i !== index))

    setImageDurations((previous) =>
      previous.filter((_, i) => i !== index),
    )
  }

  const moveImage = (index, direction) => {
    const target = index + direction

    if (target < 0 || target >= images.length) return

    setImages((previous) => {
      const updated = [...previous]
      ;[updated[index], updated[target]] = [
        updated[target],
        updated[index],
      ]
      return updated
    })

    setImageDurations((previous) => {
      const updated = [...previous]
      ;[updated[index], updated[target]] = [
        updated[target],
        updated[index],
      ]
      return updated
    })
  }

  const handleAudioChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!AUDIO_TYPES.includes(file.type)) {
      setLocalError('Choose a supported MP3, WAV, OGG, or AAC audio file.')
      return
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setLocalError('Audio must be smaller than 50 MB.')
      return
    }

    const nextPreview = createObjectUrl(file)

    setAudioFile(file)

    setAudioPreview((previous) => {
      releaseObjectUrl(previous)
      return nextPreview
    })

    try {
      setAudioDuration(await getMediaDuration(file))
      setLocalError('')
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const removeAudio = () => {
    setAudioFile(null)

    setAudioPreview((previous) => {
      releaseObjectUrl(previous)
      return ''
    })

    setAudioDuration(null)
  }

  const pictureDuration = imageDurations.reduce(
    (total, duration) => total + Number(duration || 0),
    0,
  )

  const validate = (type) => {
    if (!title.trim()) return 'Enter a title for your Short.'
    if (title.trim().length > 120) return 'Keep the title under 120 characters.'
    if (caption.trim().length > 2200) return 'Keep the caption under 2,200 characters.'

    if (mode === 'video' && !videoFile) {
      return 'Choose a video before continuing.'
    }

    if (mode === 'link' && !getVideoSource(videoUrl)?.valid) {
      return 'Paste a valid video link.'
    }

    if (mode === 'media') {
      if (images.length === 0) return 'Add at least one picture.'

      if (!audioFile) return 'Choose background music.'

      if (pictureDuration > totalDuration) {
        return 'The combined picture durations exceed the total video duration.'
      }

      return 'Picture and music uploads need a video-rendering feature before they can be published. Your selections are ready, but this feature is not connected yet.'
    }

    if (type === 'schedule') {
      if (!scheduledAt) {
        return 'Choose a date and time to schedule your Short.'
      }

      if (new Date(scheduledAt).getTime() <= Date.now()) {
        return 'Choose a future date and time.'
      }
    }

    return null
  }

  const saveShort = async (type) => {
    if (busy) return

    if (!user) {
      navigate('/login', {
        state: { from: { pathname: '/upload' } },
      })
      return
    }

    setLocalError('')

    const validationError = validate(type)

    if (validationError) {
      setLocalError(validationError)
      return
    }

    setAction(type)

    try {
      let result

      if (mode === 'video') {
        result = await shortService.createShort({
          video: videoFile,
          title: title.trim(),
          caption: caption.trim(),
          status: type === 'publish' ? 'published' : 'draft',
        })
      } else if (mode === 'link') {
        const source = getVideoSource(videoUrl)

        result = await shortService.createShortFromLink({
          url: source.canonicalUrl,
          title: title.trim(),
          caption: caption.trim(),
          status: type === 'publish' ? 'published' : 'draft',
        })
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Your Short could not be saved.')
      }

      if (type === 'schedule') {
        const shortId = result?.short?.id

        if (!shortId) {
          throw new Error(
            'The Short was created, but its ID was not returned. Scheduling could not continue.',
          )
        }

        const scheduleResult = await shortService.scheduleShort(
          shortId,
          new Date(scheduledAt).toISOString(),
        )

        if (!scheduleResult?.success) {
          throw new Error(
            scheduleResult?.error || 'The Short could not be scheduled.',
          )
        }
      }

      const messages = {
        draft: 'Your Short has been saved as a draft.',
        publish: 'Your Short has been published!',
        schedule: 'Your Short has been scheduled!',
      }

      navigate('/my-vault?tab=drafts', {
        replace: true,
        state: {
          message: messages[type],
          activeTab: 'drafts',
        },
      })
    } catch (err) {
      setLocalError(err?.message || 'Something went wrong while saving.')
    } finally {
      setAction('')
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-vault-bg px-4 py-10 text-vault-text">
        <section className="w-full max-w-md rounded-3xl border border-orange-500/20 bg-vault-surface p-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
            <Film size={30} />
          </div>

          <p className="mt-6 text-xs font-bold tracking-[3px] text-orange-400">
            ANIME VAULT CREATOR
          </p>

          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
            Sign in to create a Short
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-vault-muted">
            You can explore Anime Vault as a guest, but you need an account to
            upload videos, save drafts, and publish Shorts.
          </p>

          <div className="mt-7 grid gap-3">
            <Link
              to="/login"
              state={{ from: { pathname: '/upload' } }}
              className="flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white transition duration-300 hover:bg-orange-400 hover:shadow-[0_8px_30px_rgba(249,115,22,0.2)]"
            >
              Sign in
            </Link>

            <Link
              to="/signup"
              state={{ from: { pathname: '/upload' } }}
              className="flex items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3.5 text-sm font-bold text-orange-300 transition duration-300 hover:border-orange-400/60 hover:bg-orange-500/15"
            >
              Create an account
            </Link>
          </div>

          <Link
            to="/shorts"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-vault-muted transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Shorts
          </Link>
        </section>
      </main>
    )
  }

  const modes = [
    { id: 'video', label: 'Upload video', icon: UploadIcon },
    { id: 'link', label: 'Video link', icon: Link2 },
    { id: 'media', label: 'Pictures + music', icon: ImagePlus },
  ]

  const inputClass =
    'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-vault-accent'

  const labelClass = 'text-sm font-semibold text-white'

  return (
    <main className="min-h-screen bg-vault-bg px-4 py-6 text-vault-text sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/shorts"
          className="mb-6 inline-flex items-center gap-2 text-sm text-vault-muted hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Shorts
        </Link>

        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vault-purple/20 text-vault-accent">
            <Film size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-black sm:text-3xl">
              Create a <span className="text-vault-accent">Short</span>
            </h1>
            <p className="mt-1 text-sm text-vault-muted">
              Choose how you want to create your video.
            </p>
          </div>
        </div>

        {localError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-6 rounded-2xl border border-white/10 bg-vault-surface p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {modes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => switchMode(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    mode === id
                      ? 'border-vault-accent/50 bg-vault-purple/20 text-white'
                      : 'border-white/10 text-vault-muted hover:bg-white/5 hover:text-white'
                  } disabled:opacity-50`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

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
                    className="mt-2 flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 p-6 text-center hover:border-vault-accent/60 hover:bg-vault-purple/10"
                  >
                    <UploadIcon size={34} className="mb-3 text-vault-accent" />
                    <span className="font-bold">Choose a video</span>
                    <span className="mt-2 text-xs text-vault-muted">
                      MP4, WebM, or MOV · Up to 100 MB
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
                          {videoDuration != null &&
                            ` · ${formatDuration(videoDuration)}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeVideo}
                        aria-label="Remove video"
                        className="rounded-lg p-2 text-red-300 hover:bg-red-400/10"
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
                    onChange={(event) =>
                      handleVideoUrlChange(event.target.value)
                    }
                    placeholder="Paste a YouTube, TikTok, Instagram, or video URL"
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-vault-muted">
                  External links are saved as references. Playback depends on
                  the platform's embed permissions.
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
                        <ExternalLink
                          size={28}
                          className="text-vault-accent"
                        />
                        <p className="text-sm font-semibold">
                          {videoSource.platform} link detected
                        </p>
                        <a
                          href={videoSource.canonicalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-lg bg-vault-purple px-4 py-2 text-sm font-semibold text-white"
                        >
                          Open original video
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'media' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                  You can arrange pictures and select music here. Turning them
                  into a playable video requires a video-rendering feature,
                  which is not connected to the Shorts service yet.
                </div>

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
                    className="mt-2 flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 p-5 text-center hover:border-vault-accent/60 hover:bg-vault-purple/10"
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
                                    previous.map((duration, i) =>
                                      i === index
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
                              disabled={index === 0}
                              onClick={() => moveImage(index, -1)}
                              aria-label="Move picture earlier"
                              className="rounded p-1 text-vault-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp size={17} />
                            </button>

                            <button
                              type="button"
                              disabled={index === images.length - 1}
                              onClick={() => moveImage(index, 1)}
                              aria-label="Move picture later"
                              className="rounded p-1 text-vault-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              aria-label="Remove picture"
                              className="rounded p-1 text-red-300"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-vault-muted">
                    Picture durations total {pictureDuration} seconds.
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
                        className="rounded-lg p-2 text-red-300"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  {audioPreview && (
                    <audio
                      src={audioPreview}
                      controls
                      className="mt-3 w-full"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="total-duration" className={labelClass}>
                    Total video duration
                  </label>

                  <select
                    id="total-duration"
                    value={totalDuration}
                    onChange={(event) =>
                      setTotalDuration(Number(event.target.value))
                    }
                    className={inputClass}
                  >
                    {[15, 30, 45, 60].map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds} seconds
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-vault-muted">
                    Combined picture durations cannot exceed {totalDuration}{' '}
                    seconds.
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

            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock size={19} className="text-vault-accent" />
                <h2 className="font-bold">Schedule publication</h2>
              </div>

              <label
                htmlFor="schedule-date"
                className="text-sm text-vault-muted"
              >
                Choose a future date and time
              </label>

              <input
                id="schedule-date"
                type="datetime-local"
                min={getMinimumDateTime()}
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={busy || mode === 'media'}
                onClick={() => saveShort('draft')}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3.5 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action === 'draft' ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Save Draft
              </button>

              <button
                type="button"
                disabled={busy || mode === 'media'}
                onClick={() => saveShort('publish')}
                className="flex items-center justify-center gap-2 rounded-xl bg-vault-purple px-3 py-3.5 text-sm font-bold text-white hover:bg-vault-purple/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action === 'publish' ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                Publish
              </button>

              <button
                type="button"
                disabled={busy || mode === 'media'}
                onClick={() => saveShort('schedule')}
                className="flex items-center justify-center gap-2 rounded-xl border border-vault-accent/30 bg-vault-purple/15 px-3 py-3.5 text-sm font-bold text-vault-accent hover:bg-vault-purple/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action === 'schedule' ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <CalendarClock size={18} />
                )}
                Schedule
              </button>
            </div>

            {busy && (
              <p className="text-center text-xs text-vault-muted">
                Processing your Short. Please keep this page open.
              </p>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-vault-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <Film size={19} className="text-vault-accent" />
                <h2 className="font-bold">Preview</h2>
              </div>

              <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black">
                {mode === 'video' && videoPreview ? (
                  <video
                    src={videoPreview}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : mode === 'link' && videoSource?.embedUrl ? (
                  <iframe
                    src={videoSource.embedUrl}
                    title="External video preview"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    className="h-full w-full border-0"
                    allowFullScreen
                  />
                ) : mode === 'link' &&
                  videoSource?.platform === 'Direct video' ? (
                  <video
                    src={videoSource.canonicalUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : mode === 'media' && images.length > 0 ? (
                  <img
                    src={images[0].preview}
                    alt="First picture in your video"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-5 text-center text-vault-muted">
                    <Film size={35} className="mb-3 opacity-50" />
                    <p className="text-sm font-semibold">
                      Your Short preview
                    </p>
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
                <Clock3 size={14} />
                {mode === 'video' && videoDuration != null
                  ? `Duration: ${formatDuration(videoDuration)}`
                  : mode === 'media'
                    ? `${totalDuration} seconds`
                    : mode === 'link' && videoSource?.valid
                      ? `${videoSource.platform} preview`
                      : 'Waiting for media'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-vault-surface p-5">
              <h3 className="font-bold">Creator tips</h3>

              <ul className="mt-3 space-y-3 text-sm leading-5 text-vault-muted">
                <li>• Preview your video before publishing.</li>
                <li>• Give your Short a clear title.</li>
                <li>• Arrange pictures in the order you want.</li>
                <li>• Only use media you have permission to use.</li>
              </ul>

              <Link
                to="/my-vault"
                className="mt-5 flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                Open My Vault
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
