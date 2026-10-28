export function detectVideoPlatform(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Please paste a video link.')
  }

  const input = value.trim()
  let url

  try {
    url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    )
  } catch {
    throw new Error('Please enter a valid video URL.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Video links must use HTTPS.')
  }

  if (url.username || url.password) {
    throw new Error('Video URLs must not contain login credentials.')
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname

  // YouTube
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be'
  ) {
    let videoId

    if (host === 'youtu.be') {
      videoId = path.split('/').filter(Boolean)[0]
    } else if (path === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      const parts = path.split('/').filter(Boolean)

      if (['shorts', 'embed', 'live'].includes(parts[0])) {
        videoId = parts[1]
      }
    }

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      throw new Error('This YouTube URL does not contain a valid video ID.')
    }

    return {
      platform: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    }
  }

  // TikTok
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = path.match(/\/video\/(\d+)/)

    return {
      platform: 'tiktok',
      url: url.toString(),
      embedUrl: match
        ? `https://www.tiktok.com/player/v1/${match[1]}`
        : null,
      thumbnailUrl: null,
      videoId: match?.[1] || null,
    }
  }

  // X / Twitter
  if (
    host === 'x.com' ||
    host.endsWith('.x.com') ||
    host === 'twitter.com' ||
    host.endsWith('.twitter.com')
  ) {
    const match = path.match(/\/([^/]+)\/status\/(\d+)/)

    return {
      platform: 'x',
      url: url.toString(),
      embedUrl: match
        ? `https://platform.twitter.com/embed/Tweet.html?id=${match[2]}`
        : null,
      thumbnailUrl: null,
      videoId: match?.[2] || null,
    }
  }

  // Instagram
  if (
    host === 'instagram.com' ||
    host.endsWith('.instagram.com') ||
    host === 'instagr.am'
  ) {
    const match = path.match(/\/(reel|reels|p|tv)\/([^/]+)/)

    return {
      platform: 'instagram',
      url: url.toString(),
      embedUrl: match
        ? `https://www.instagram.com/${match[1]}/${match[2]}/embed`
        : null,
      thumbnailUrl: null,
      videoId: match?.[2] || null,
    }
  }

  // Facebook
  if (
    host === 'facebook.com' ||
    host.endsWith('.facebook.com') ||
    host === 'fb.watch'
  ) {
    return {
      platform: 'facebook',
      url: url.toString(),
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url.toString(),
      )}&show_text=false`,
      thumbnailUrl: null,
      videoId: null,
    }
  }

  // Direct video files
  if (/\.(mp4|webm|ogg|mov)$/i.test(path)) {
    return {
      platform: 'direct',
      url: url.toString(),
      embedUrl: null,
      thumbnailUrl: null,
      videoId: null,
    }
  }

  throw new Error(
    'Unsupported video link. Try YouTube, TikTok, X, Instagram, Facebook, or a direct video file URL.',
  )
}