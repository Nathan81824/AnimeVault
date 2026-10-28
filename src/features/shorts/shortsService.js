import { supabase } from '../../lib/supabase'

const SHORTS_TABLE = 'shorts'
const SHORTS_BUCKET = 'shorts'
const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const SUBSCRIPTIONS_TABLE = 'creator_subscriptions'
const VIEWS_TABLE = 'short_views'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

function getClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  return supabase
}

function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.code === '42501') {
    return 'You do not have permission to perform this action.'
  }

  if (error?.code === '23505') {
    return 'This record already exists.'
  }

  if (error?.message?.toLowerCase().includes('row-level security')) {
    return 'Your account does not have permission to do this.'
  }

  return error?.message || fallback
}

function requireId(id, label = 'ID') {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`${label} is required.`)
  }

  return id.trim()
}

function normalizeShort(short) {
  if (!short) return null

  return {
    ...short,
    videoUrl: short.video_url ?? null,
    youtubeUrl: short.youtube_url ?? null,
    thumbnailUrl: short.thumbnail_url ?? null,
    userId: short.user_id ?? null,
    createdAt: short.created_at ?? null,
    updatedAt: short.updated_at ?? null,
    viewCount: short.view_count ?? 0,
    likeCount: short.like_count ?? 0,
    commentCount: short.comment_count ?? 0,
    duration: short.duration ?? null,
  }
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await getClient().auth.getUser()

  if (error) throw new Error(getErrorMessage(error))
  if (!user) throw new Error('Please sign in first.')

  return user
}

function validateVideo(file) {
  if (!file) throw new Error('Please select a video.')
  if (!file.type?.startsWith('video/')) {
    throw new Error('Please select a valid video file.')
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error('The video must be smaller than 100 MB.')
  }
}

function safeFileName(file) {
  const extension = file.name?.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExtension = /^[a-z0-9]+$/.test(extension)
    ? extension
    : 'mp4'

  const id =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${id}.${safeExtension}`
}

function validateYouTubeUrl(value) {
  if (!value?.trim()) {
    throw new Error('Please enter a YouTube video or Shorts link.')
  }

  let url

  try {
    const input = value.trim()
    url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    )
  } catch {
    throw new Error('Please enter a valid YouTube link.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('YouTube links must use HTTPS.')
  }

  const host = url.hostname.toLowerCase()
  const allowedHosts = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtu.be',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
  ]

  if (!allowedHosts.includes(host)) {
    throw new Error('Please enter a valid YouTube link.')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  let videoId = null

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = parts[0]
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v')
  } else if (
    ['shorts', 'embed', 'live'].includes(parts[0]) &&
    parts.length > 1
  ) {
    videoId = parts[1]
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error('The YouTube link does not contain a valid video ID.')
  }

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

async function uploadVideo(file, userId) {
  validateVideo(file)

  const filePath = `${userId}/${safeFileName(file)}`
  const { data, error } = await getClient().storage
    .from(SHORTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) {
    throw new Error(getErrorMessage(error, 'Video upload failed.'))
  }

  return data.path
}

async function getPublicVideoUrl(path) {
  if (!path) return null

  const { data } = getClient().storage
    .from(SHORTS_BUCKET)
    .getPublicUrl(path)

  return data?.publicUrl ?? null
}

async function removeUploadedFile(path) {
  if (!path) return

  try {
    await getClient().storage.from(SHORTS_BUCKET).remove([path])
  } catch {
    // Preserve the original error.
  }
}

async function countRows(table, column, value) {
  const { count, error } = await getClient()
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)

  if (error) throw new Error(getErrorMessage(error))

  return count ?? 0
}

export const shortService = {
  async createShort({
    file,
    title = '',
    caption = '',
    thumbnailUrl = null,
    duration = null,
    publish = true,
  } = {}) {
    let uploadedPath = null

    try {
      const user = await getCurrentUser()

      if (!title.trim()) throw new Error('Please enter a title.')

      uploadedPath = await uploadVideo(file, user.id)
      const videoUrl = await getPublicVideoUrl(uploadedPath)

      if (!videoUrl) throw new Error('Could not generate the video URL.')

      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .insert({
          user_id: user.id,
          title: title.trim(),
          caption: caption.trim(),
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status: publish ? 'published' : 'draft',
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        short: {
          ...normalizeShort(data),
          source: 'upload',
          duration,
        },
        error: null,
      }
    } catch (error) {
      await removeUploadedFile(uploadedPath)

      return {
        success: false,
        short: null,
        error: getErrorMessage(error, 'Unable to create Short.'),
      }
    }
  },

  async createShortFromLink({
    url,
    youtubeUrl,
    youtubeId,
    title = '',
    caption = '',
    thumbnailUrl = null,
    duration = null,
    publish = true,
  } = {}) {
    try {
      const user = await getCurrentUser()

      const inputUrl =
        youtubeUrl ||
        url ||
        (youtubeId
          ? `https://www.youtube.com/watch?v=${youtubeId}`
          : '')

      const youtube = validateYouTubeUrl(inputUrl)

      if (!title.trim()) throw new Error('Please enter a title.')

      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .insert({
          user_id: user.id,
          title: title.trim(),
          caption: caption.trim(),
          video_url: youtube.url,
          thumbnail_url: thumbnailUrl || youtube.thumbnailUrl,
          status: publish ? 'published' : 'draft',
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        short: {
          ...normalizeShort(data),
          source: 'youtube',
          youtubeVideoId: youtube.videoId,
          youtubeUrl: youtube.url,
          embedUrl: youtube.embedUrl,
          duration,
        },
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        short: null,
        error: getErrorMessage(error, 'Unable to create linked Short.'),
      }
    }
  },

  async createShortFromMedia() {
    return {
      success: false,
      short: null,
      error: 'Please create a video file before uploading media.',
    }
  },

  async getPublishedShorts({ limit = 20, offset = 0 } = {}) {
    try {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20))
      const safeOffset = Math.max(0, Number(offset) || 0)

      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1)

      if (error) throw error

      return {
        success: true,
        shorts: (data || []).map(normalizeShort),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        shorts: [],
        error: getErrorMessage(error, 'Unable to load Shorts.'),
      }
    }
  },

  async getShortById(id) {
    try {
      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .select('*')
        .eq('id', requireId(id, 'Short ID'))
        .eq('status', 'published')
        .maybeSingle()

      if (error) throw error

      return { success: true, short: normalizeShort(data), error: null }
    } catch (error) {
      return {
        success: false,
        short: null,
        error: getErrorMessage(error, 'Unable to load Short.'),
      }
    }
  },

  async getMyShorts() {
    try {
      const user = await getCurrentUser()
      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        shorts: (data || []).map(normalizeShort),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        shorts: [],
        error: getErrorMessage(error, 'Unable to load your Shorts.'),
      }
    }
  },

  async publishShort(id) {
    try {
      const user = await getCurrentUser()
      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requireId(id, 'Short ID'))
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select()
        .single()

      if (error) throw error

      return { success: true, short: normalizeShort(data), error: null }
    } catch (error) {
      return {
        success: false,
        short: null,
        error: getErrorMessage(error, 'Unable to publish Short.'),
      }
    }
  },

  async deleteShort(id) {
    try {
      const user = await getCurrentUser()
      const client = getClient()
      const shortId = requireId(id, 'Short ID')

      const { data: short, error: findError } = await client
        .from(SHORTS_TABLE)
        .select('id, user_id, video_url')
        .eq('id', shortId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (findError) throw findError
      if (!short) throw new Error('Short not found or not yours.')

      const { error } = await client
        .from(SHORTS_TABLE)
        .delete()
        .eq('id', shortId)
        .eq('user_id', user.id)

      if (error) throw error

      if (short.video_url) {
        try {
          const videoUrl = new URL(short.video_url)
          const marker = `/storage/v1/object/public/${SHORTS_BUCKET}/`
          const index = videoUrl.pathname.indexOf(marker)

          if (index !== -1) {
            const path = decodeURIComponent(
              videoUrl.pathname.slice(index + marker.length),
            )

            if (path.startsWith(`${user.id}/`)) {
              await client.storage.from(SHORTS_BUCKET).remove([path])
            }
          }
        } catch {
          // The database record has already been removed.
        }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Unable to delete Short.'),
      }
    }
  },

  async getVideoUrl(path) {
    try {
      return {
        success: true,
        url: await getPublicVideoUrl(path),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        url: null,
        error: getErrorMessage(error, 'Unable to load video URL.'),
      }
    }
  },

  async recordView(shortId) {
    try {
      const client = getClient()
      const id = requireId(shortId, 'Short ID')

      const { data: short, error: shortError } = await client
        .from(SHORTS_TABLE)
        .select('id')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (shortError) throw shortError
      if (!short) throw new Error('Short is not available.')

      const user = await getCurrentUser()
      const { error } = await client
        .from(VIEWS_TABLE)
        .upsert(
          { short_id: id, viewer_id: user.id },
          {
            onConflict: 'short_id,viewer_id',
            ignoreDuplicates: true,
          },
        )

      if (error) throw error

      return {
        success: true,
        recorded: true,
        viewCount: await countRows(VIEWS_TABLE, 'short_id', id),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        recorded: false,
        error: getErrorMessage(error, 'Unable to record view.'),
      }
    }
  },

  async getViewCount(shortId) {
    try {
      const viewCount = await countRows(
        VIEWS_TABLE,
        'short_id',
        requireId(shortId, 'Short ID'),
      )

      return { success: true, viewCount, error: null }
    } catch (error) {
      return {
        success: false,
        viewCount: 0,
        error: getErrorMessage(error, 'Unable to load views.'),
      }
    }
  },

  async likeShort(shortId) {
    try {
      const user = await getCurrentUser()
      const id = requireId(shortId, 'Short ID')

      const { error } = await getClient()
        .from(LIKES_TABLE)
        .upsert(
          { short_id: id, user_id: user.id },
          {
            onConflict: 'short_id,user_id',
            ignoreDuplicates: true,
          },
        )

      if (error) throw error

      return {
        success: true,
        liked: true,
        likeCount: await countRows(LIKES_TABLE, 'short_id', id),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        liked: false,
        error: getErrorMessage(error, 'Unable to like Short.'),
      }
    }
  },

  async unlikeShort(shortId) {
    try {
      const user = await getCurrentUser()
      const id = requireId(shortId, 'Short ID')

      const { error } = await getClient()
        .from(LIKES_TABLE)
        .delete()
        .eq('short_id', id)
        .eq('user_id', user.id)

      if (error) throw error

      return {
        success: true,
        liked: false,
        likeCount: await countRows(LIKES_TABLE, 'short_id', id),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        liked: true,
        error: getErrorMessage(error, 'Unable to unlike Short.'),
      }
    }
  },

  async hasLikedShort(shortId) {
    try {
      const user = await getCurrentUser()
      const { data, error } = await getClient()
        .from(LIKES_TABLE)
        .select('short_id')
        .eq('short_id', requireId(shortId, 'Short ID'))
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      return { success: true, liked: Boolean(data), error: null }
    } catch (error) {
      return {
        success: false,
        liked: false,
        error: getErrorMessage(error, 'Unable to check like.'),
      }
    }
  },

  async getComments(shortId, { limit = 50, offset = 0 } = {}) {
    try {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50))
      const safeOffset = Math.max(0, Number(offset) || 0)

      const { data, error } = await getClient()
        .from(COMMENTS_TABLE)
        .select('*')
        .eq('short_id', requireId(shortId, 'Short ID'))
        .order('created_at', { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1)

      if (error) throw error

      return { success: true, comments: data || [], error: null }
    } catch (error) {
      return {
        success: false,
        comments: [],
        error: getErrorMessage(error, 'Unable to load comments.'),
      }
    }
  },

  async addComment(shortId, content) {
    try {
      const user = await getCurrentUser()
      const cleanContent = content?.trim()

      if (!cleanContent) throw new Error('Please enter a comment.')
      if (cleanContent.length > 2000) {
        throw new Error('Comments must be 2,000 characters or fewer.')
      }

      const { data, error } = await getClient()
        .from(COMMENTS_TABLE)
        .insert({
          short_id: requireId(shortId, 'Short ID'),
          user_id: user.id,
          content: cleanContent,
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        comment: data,
        commentCount: await countRows(
          COMMENTS_TABLE,
          'short_id',
          shortId,
        ),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        comment: null,
        error: getErrorMessage(error, 'Unable to add comment.'),
      }
    }
  },

  async deleteComment(commentId) {
    try {
      const user = await getCurrentUser()
      const client = getClient()

      const { data: comment, error: findError } = await client
        .from(COMMENTS_TABLE)
        .select('id, short_id')
        .eq('id', requireId(commentId, 'Comment ID'))
        .eq('user_id', user.id)
        .maybeSingle()

      if (findError) throw findError
      if (!comment) throw new Error('Comment not found or not yours.')

      const { error } = await client
        .from(COMMENTS_TABLE)
        .delete()
        .eq('id', comment.id)
        .eq('user_id', user.id)

      if (error) throw error

      return {
        success: true,
        commentCount: await countRows(
          COMMENTS_TABLE,
          'short_id',
          comment.short_id,
        ),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Unable to delete comment.'),
      }
    }
  },

  async isSubscribedToCreator(creatorId) {
    try {
      const user = await getCurrentUser()
      const { data, error } = await getClient()
        .from(SUBSCRIPTIONS_TABLE)
        .select('creator_id')
        .eq('subscriber_id', user.id)
        .eq('creator_id', requireId(creatorId, 'Creator ID'))
        .maybeSingle()

      if (error) throw error

      return { success: true, subscribed: Boolean(data), error: null }
    } catch (error) {
      return {
        success: false,
        subscribed: false,
        error: getErrorMessage(error, 'Unable to check subscription.'),
      }
    }
  },

  async checkSubscribed(creatorId) {
    return shortService.isSubscribedToCreator(creatorId)
  },

  async subscribeToCreator(creatorId) {
    try {
      const user = await getCurrentUser()
      const id = requireId(creatorId, 'Creator ID')

      if (id === user.id) {
        throw new Error('You cannot subscribe to yourself.')
      }

      const { error } = await getClient()
        .from(SUBSCRIPTIONS_TABLE)
        .upsert(
          { subscriber_id: user.id, creator_id: id },
          {
            onConflict: 'subscriber_id,creator_id',
            ignoreDuplicates: true,
          },
        )

      if (error) throw error

      return {
        success: true,
        subscribed: true,
        subscriberCount: await countRows(
          SUBSCRIPTIONS_TABLE,
          'creator_id',
          id,
        ),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        subscribed: false,
        error: getErrorMessage(error, 'Unable to subscribe.'),
      }
    }
  },

  async unsubscribeFromCreator(creatorId) {
    try {
      const user = await getCurrentUser()
      const id = requireId(creatorId, 'Creator ID')

      const { error } = await getClient()
        .from(SUBSCRIPTIONS_TABLE)
        .delete()
        .eq('subscriber_id', user.id)
        .eq('creator_id', id)

      if (error) throw error

      return {
        success: true,
        subscribed: false,
        subscriberCount: await countRows(
          SUBSCRIPTIONS_TABLE,
          'creator_id',
          id,
        ),
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        subscribed: true,
        error: getErrorMessage(error, 'Unable to unsubscribe.'),
      }
    }
  },

  async getSubscriberCount(creatorId) {
    try {
      const subscriberCount = await countRows(
        SUBSCRIPTIONS_TABLE,
        'creator_id',
        requireId(creatorId, 'Creator ID'),
      )

      return { success: true, subscriberCount, error: null }
    } catch (error) {
      return {
        success: false,
        subscriberCount: 0,
        error: getErrorMessage(error, 'Unable to load subscribers.'),
      }
    }
  },
}

export default shortService
