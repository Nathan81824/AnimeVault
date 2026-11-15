
import { supabase } from '../../../lib/supabase'

const SHORTS_TABLE = 'shorts'
const SHORTS_BUCKET = 'shorts'
const PROFILES_TABLE = 'profiles'
const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const SUBSCRIPTIONS_TABLE = 'creator_subscriptions'
const VIEWS_TABLE = 'short_views'
const SAVED_SHORTS_TABLE = 'saved_shorts'
const PLAYLISTS_TABLE = 'short_playlists'
const PLAYLIST_SHORTS_TABLE = 'playlist_shorts'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const DEFAULT_PLAYLIST = 'Watch Later'

function getClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function getErrorMessage(error, fallback = 'Something went wrong.') {
  return error?.message || error?.error_description || fallback
}

function requireId(id, label = 'ID') {
  if (!id || typeof id !== 'string') {
    throw new Error(`${label} is required.`)
  }
  return id
}

function validateYouTubeUrl(url) {
  try {
    const parsed = new URL(url)

    return [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
    ].includes(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

function normalizeShort(short) {
  if (!short) return null

  return {
    ...short,
    videoUrl: short.video_url ?? null,
    youtubeUrl: validateYouTubeUrl(short.video_url || '')
      ? short.video_url
      : null,
    thumbnailUrl: short.thumbnail_url ?? null,
    userId: short.user_id ?? null,
    likeCount: Number(short.like_count ?? 0),
    commentCount: Number(short.comment_count ?? 0),
    viewCount: Number(short.view_count ?? 0),
    duration: Number(short.duration ?? 0),
    scheduledAt: short.scheduled_at ?? null,
    publishedAt: short.published_at ?? null,
    createdAt: short.created_at ?? null,
    updatedAt: short.updated_at ?? null,
  }
}

async function attachCreatorProfiles(shorts) {
  if (!shorts?.length) return []

  const normalizedShorts = shorts.map(normalizeShort)

  const userIds = [
    ...new Set(
      shorts
        .map((short) => short.user_id)
        .filter(Boolean),
    ),
  ]

  if (!userIds.length) return normalizedShorts

  const { data: profiles, error } = await getClient()
    .from(PROFILES_TABLE)
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)

  if (error) {
    console.error('Could not load creator profiles:', error)
    return normalizedShorts.map((short) => ({
      ...short,
      creatorProfile: null,
      profile: null,
      profiles: null,
    }))
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        ...profile,
        username: profile.username || '',
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url || '',
      },
    ]),
  )

  return normalizedShorts.map((short) => {
    const profile = profileMap.get(short.user_id) || null

    return {
      ...short,
      creatorProfile: profile,
      profile,
      profiles: profile,
      creator: profile,
      username: profile?.username || '',
      displayName: profile?.display_name || '',
      avatar_url: profile?.avatar_url || '',
      avatarUrl: profile?.avatar_url || '',
    }
  })
}

async function getShortWithCreator(short) {
  if (!short) return null

  const results = await attachCreatorProfiles([short])
  return results[0] || null
}

async function getCurrentUser() {
  const client = getClient()

  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error) throw error

  if (!user) {
    throw new Error('You must be signed in to perform this action.')
  }

  return user
}

function validateVideoFile(file) {
  if (!file) throw new Error('Please select a video.')

  if (!file.type?.startsWith('video/')) {
    throw new Error('Please select a valid video file.')
  }

  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error('Video must be smaller than 100 MB.')
  }

  return true
}

function getFileExtension(file) {
  const name = file.name || ''
  const extension = name.split('.').pop()?.toLowerCase()

  return extension && extension !== name.toLowerCase()
    ? extension
    : 'mp4'
}

function getPublicVideoUrl(path) {
  const { data } = getClient().storage
    .from(SHORTS_BUCKET)
    .getPublicUrl(path)

  return data?.publicUrl || null
}

async function countRows(query) {
  const { count, error } = await query

  if (error) throw error

  return count ?? 0
}

async function getOrCreateWatchLater(userId) {
  const { data, error } = await getClient()
    .from(PLAYLISTS_TABLE)
    .upsert(
      {
        user_id: userId,
        name: DEFAULT_PLAYLIST,
        description: 'Shorts saved to watch later.',
      },
      { onConflict: 'user_id,name' },
    )
    .select('*')
    .single()

  if (error) throw error

  return data
}

const shortService = {
  async createShort({
    title,
    caption = '',
    video,
    thumbnail = null,
    status = 'published',
    publish,
  }) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      if (!title?.trim()) {
        throw new Error('Short title is required.')
      }

      validateVideoFile(video)

      const finalStatus =
        typeof publish === 'boolean'
          ? publish
            ? 'published'
            : 'draft'
          : status

      if (!['draft', 'published'].includes(finalStatus)) {
        throw new Error('Invalid Short status.')
      }

      const extension = getFileExtension(video)
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await client.storage
        .from(SHORTS_BUCKET)
        .upload(filePath, video, {
          cacheControl: '3600',
          upsert: false,
          contentType: video.type,
        })

      if (uploadError) throw uploadError

      const videoUrl = getPublicVideoUrl(filePath)

      if (!videoUrl) {
        throw new Error('Could not generate the video URL.')
      }

      let thumbnailUrl = null

      if (thumbnail) {
        if (!thumbnail.type?.startsWith('image/')) {
          throw new Error('Thumbnail must be an image.')
        }

        const thumbnailExtension =
          thumbnail.name?.split('.').pop()?.toLowerCase() || 'jpg'

        const thumbnailPath =
          `${user.id}/thumbnails/${crypto.randomUUID()}.${thumbnailExtension}`

        const { error: thumbnailError } = await client.storage
          .from(SHORTS_BUCKET)
          .upload(thumbnailPath, thumbnail, {
            cacheControl: '3600',
            upsert: false,
            contentType: thumbnail.type,
          })

        if (thumbnailError) throw thumbnailError

        thumbnailUrl = getPublicVideoUrl(thumbnailPath)
      }

      const now = new Date().toISOString()

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .insert({
          user_id: user.id,
          title: title.trim(),
          caption: caption.trim(),
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status: finalStatus,
          scheduled_at: null,
          published_at: finalStatus === 'published' ? now : null,
        })
        .select('*')
        .single()

      if (error) throw error

      const short = await getShortWithCreator(data)

      return {
        success: true,
        short,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not create Short.'),
      }
    }
  },

  async createShortFromLink({
    title,
    caption = '',
    url,
    videoUrl,
    status = 'published',
    publish,
  }) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      const sourceUrl = (url || videoUrl || '').trim()

      if (!title?.trim()) {
        throw new Error('Short title is required.')
      }

      if (!sourceUrl) {
        throw new Error('Please paste a video link.')
      }

      let parsedUrl

      try {
        parsedUrl = new URL(sourceUrl)
      } catch {
        throw new Error('Please provide a valid video URL.')
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Video links must start with http:// or https://.')
      }

      const finalStatus =
        typeof publish === 'boolean'
          ? publish
            ? 'published'
            : 'draft'
          : status

      if (!['draft', 'published'].includes(finalStatus)) {
        throw new Error('Invalid Short status.')
      }

      const now = new Date().toISOString()

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .insert({
          user_id: user.id,
          title: title.trim(),
          caption: caption.trim(),
          video_url: sourceUrl,
          thumbnail_url: null,
          status: finalStatus,
          scheduled_at: null,
          published_at: finalStatus === 'published' ? now : null,
        })
        .select('*')
        .single()

      if (error) throw error

      const short = await getShortWithCreator(data)

      return {
        success: true,
        short,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not create Short from link.'),
      }
    }
  },

  async createShortFromMedia() {
    return {
      success: false,
      error: 'Pictures and music cannot be converted into a video yet. A video-rendering feature is required.',
    }
  },

  async getPublishedShorts({ limit = 20, offset = 0 } = {}) {
    try {
      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .select('*')
        .eq('status', 'published')
        .order('published_at', {
          ascending: false,
          nullsFirst: false,
        })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      const shorts = await attachCreatorProfiles(data ?? [])

      return {
        success: true,
        shorts,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load Shorts.'),
        shorts: [],
      }
    }
  },

  async getShortById(id) {
    try {
      requireId(id, 'Short ID')

      const { data, error } = await getClient()
        .from(SHORTS_TABLE)
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) throw error

      const short = await getShortWithCreator(data)

      return {
        success: true,
        short,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load this Short.'),
      }
    }
  },

  async getMyShorts() {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const shorts = await attachCreatorProfiles(data ?? [])

      return {
        success: true,
        shorts,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load your Shorts.'),
        shorts: [],
      }
    }
  },

  async publishShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const now = new Date().toISOString()

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .update({
          status: 'published',
          published_at: now,
          scheduled_at: null,
          updated_at: now,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select('*')
        .single()

      if (error) throw error

      return {
        success: true,
        short: await getShortWithCreator(data),
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not publish Short.'),
      }
    }
  },

  async scheduleShort(id, scheduledAt) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const scheduledDate = new Date(scheduledAt)

      if (!scheduledAt || Number.isNaN(scheduledDate.getTime())) {
        throw new Error('Please provide a valid publication date and time.')
      }

      if (scheduledDate.getTime() <= Date.now()) {
        throw new Error('Choose a publication time in the future.')
      }

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .update({
          scheduled_at: scheduledDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select('*')
        .single()

      if (error) throw error

      return {
        success: true,
        short: await getShortWithCreator(data),
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not schedule Short.'),
      }
    }
  },

  async cancelShortSchedule(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { data, error } = await client
        .from(SHORTS_TABLE)
        .update({
          scheduled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select('*')
        .single()

      if (error) throw error

      return {
        success: true,
        short: await getShortWithCreator(data),
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not cancel schedule.'),
      }
    }
  },

  async deleteShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { data: short, error: fetchError } = await client
        .from(SHORTS_TABLE)
        .select('id, user_id, video_url, thumbnail_url')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError

      const { error: deleteError } = await client
        .from(SHORTS_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      const urls = [short.video_url, short.thumbnail_url].filter(Boolean)

      const storagePaths = urls
        .map((url) => {
          const marker = `/storage/v1/object/public/${SHORTS_BUCKET}/`

          if (!url.includes(marker)) return null

          const path = decodeURIComponent(url.split(marker)[1])

          return path.startsWith(`${user.id}/`) ? path : null
        })
        .filter(Boolean)

      if (storagePaths.length > 0) {
        const { error: storageError } = await client.storage
          .from(SHORTS_BUCKET)
          .remove(storagePaths)

        if (storageError) {
          return {
            success: true,
            warning: 'Short deleted, but its storage file could not be removed.',
          }
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not delete Short.'),
      }
    }
  },

  async recordView(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { data, error } = await client
        .from(VIEWS_TABLE)
        .insert({
          short_id: id,
          user_id: user.id,
          viewer_id: user.id,
        })
        .select('id, short_id, user_id, created_at')
        .single()

      if (error) throw error

      return {
        success: true,
        view: data,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not record view.'),
      }
    }
  },

  async getViewCount(id) {
    try {
      requireId(id, 'Short ID')

      const count = await countRows(
        getClient()
          .from(VIEWS_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('short_id', id)
      )

      return {
        success: true,
        count,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not get view count.'),
        count: 0,
      }
    }
  },

  async likeShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { error } = await client
        .from(LIKES_TABLE)
        .insert({
          short_id: id,
          user_id: user.id,
        })

      if (error && error.code !== '23505') throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not like Short.'),
      }
    }
  },

  async unlikeShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { error } = await client
        .from(LIKES_TABLE)
        .delete()
        .eq('short_id', id)
        .eq('user_id', user.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not unlike Short.'),
      }
    }
  },

  async hasLikedShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { data, error } = await client
        .from(LIKES_TABLE)
        .select('short_id')
        .eq('short_id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      return {
        success: true,
        liked: Boolean(data),
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not check like status.'),
        liked: false,
      }
    }
  },

  async getComments(id) {
    try {
      requireId(id, 'Short ID')

      const { data, error } = await getClient()
        .from(COMMENTS_TABLE)
        .select('*')
        .eq('short_id', id)
        .order('created_at', { ascending: true })

      if (error) throw error

      return {
        success: true,
        comments: data ?? [],
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load comments.'),
        comments: [],
      }
    }
  },

  async addComment(id, content) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      if (!content?.trim()) {
        throw new Error('Comment cannot be empty.')
      }

      const { data, error } = await client
        .from(COMMENTS_TABLE)
        .insert({
          short_id: id,
          user_id: user.id,
          content: content.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      return {
        success: true,
        comment: data,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not add comment.'),
      }
    }
  },

  async deleteComment(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Comment ID')

      const { error } = await client
        .from(COMMENTS_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not delete comment.'),
      }
    }
  },

  async checkSubscribed(creatorId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(creatorId, 'Creator ID')

      const { data, error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .select('creator_id')
        .eq('creator_id', creatorId)
        .eq('subscriber_id', user.id)
        .maybeSingle()

      if (error) throw error

      return {
        success: true,
        subscribed: Boolean(data),
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not check subscription.'),
        subscribed: false,
      }
    }
  },

  async subscribeToCreator(creatorId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(creatorId, 'Creator ID')

      if (creatorId === user.id) {
        throw new Error('You cannot subscribe to yourself.')
      }

      const { error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .insert({
          creator_id: creatorId,
          subscriber_id: user.id,
        })

      if (error && error.code !== '23505') throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not subscribe.'),
      }
    }
  },

  async unsubscribeFromCreator(creatorId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(creatorId, 'Creator ID')

      const { error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .delete()
        .eq('creator_id', creatorId)
        .eq('subscriber_id', user.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not unsubscribe.'),
      }
    }
  },

  async saveShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { error: saveError } = await client
        .from(SAVED_SHORTS_TABLE)
        .upsert(
          {
            user_id: user.id,
            short_id: id,
          },
          {
            onConflict: 'user_id,short_id',
            ignoreDuplicates: true,
          }
        )

      if (saveError) throw saveError

      const playlist = await getOrCreateWatchLater(user.id)

      const { error: playlistError } = await client
        .from(PLAYLIST_SHORTS_TABLE)
        .upsert(
          {
            user_id: user.id,
            playlist_id: playlist.id,
            short_id: id,
          },
          {
            onConflict: 'playlist_id,short_id',
            ignoreDuplicates: true,
          }
        )

      if (playlistError) throw playlistError

      return {
        success: true,
        message: 'Short saved to My Vault and Watch Later.',
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not save Short.'),
      }
    }
  },

  async unsaveShort(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Short ID')

      const { error } = await client
        .from(SAVED_SHORTS_TABLE)
        .delete()
        .eq('user_id', user.id)
        .eq('short_id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not remove saved Short.'),
      }
    }
  },

  async getSavedShorts() {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      const { data, error } = await client
        .from(SAVED_SHORTS_TABLE)
        .select('id, short_id, created_at, shorts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const savedItems = (data ?? []).filter((item) => item.shorts)
      const shorts = await attachCreatorProfiles(
        savedItems.map((item) => item.shorts),
      )

      const result = shorts.map((short, index) => ({
        ...short,
        savedId: savedItems[index].id,
        savedAt: savedItems[index].created_at,
      }))

      return {
        success: true,
        shorts: result,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load saved Shorts.'),
        shorts: [],
      }
    }
  },

  async createPlaylist(name, description = '') {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      if (!name?.trim()) {
        throw new Error('Playlist name is required.')
      }

      const { data, error } = await client
        .from(PLAYLISTS_TABLE)
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have a playlist with that name.')
        }

        throw error
      }

      return {
        success: true,
        playlist: data,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not create playlist.'),
      }
    }
  },

  async getMyPlaylists() {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      const { data, error } = await client
        .from(PLAYLISTS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        playlists: data ?? [],
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load playlists.'),
        playlists: [],
      }
    }
  },

  async addShortToPlaylist(playlistId, shortId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(playlistId, 'Playlist ID')
      requireId(shortId, 'Short ID')

      const { data: saved, error: savedError } = await client
        .from(SAVED_SHORTS_TABLE)
        .select('id')
        .eq('user_id', user.id)
        .eq('short_id', shortId)
        .maybeSingle()

      if (savedError) throw savedError

      if (!saved) {
        throw new Error(
          'Save this Short to My Vault before adding it to a playlist.'
        )
      }

      const { error } = await client
        .from(PLAYLIST_SHORTS_TABLE)
        .upsert(
          {
            user_id: user.id,
            playlist_id: playlistId,
            short_id: shortId,
          },
          {
            onConflict: 'playlist_id,short_id',
            ignoreDuplicates: true,
          }
        )

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not add Short to playlist.'),
      }
    }
  },

  async removeShortFromPlaylist(playlistId, shortId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(playlistId, 'Playlist ID')
      requireId(shortId, 'Short ID')

      const { error } = await client
        .from(PLAYLIST_SHORTS_TABLE)
        .delete()
        .eq('user_id', user.id)
        .eq('playlist_id', playlistId)
        .eq('short_id', shortId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not remove Short from playlist.'),
      }
    }
  },

  async getPlaylistShorts(playlistId) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(playlistId, 'Playlist ID')

      const { data, error } = await client
        .from(PLAYLIST_SHORTS_TABLE)
        .select(`
          id,
          short_id,
          created_at,
          saved_shorts!inner (
            short_id,
            shorts (*)
          )
        `)
        .eq('user_id', user.id)
        .eq('playlist_id', playlistId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rawShorts = (data ?? [])
        .map((item) => {
          const saved = item.saved_shorts
          const short = Array.isArray(saved)
            ? saved[0]?.shorts
            : saved?.shorts

          if (!short) return null

          return {
            short,
            playlistEntryId: item.id,
            addedAt: item.created_at,
          }
        })
        .filter(Boolean)

      const shorts = await attachCreatorProfiles(
        rawShorts.map((item) => item.short),
      )

      const result = shorts.map((short, index) => ({
        ...short,
        playlistEntryId: rawShorts[index].playlistEntryId,
        addedAt: rawShorts[index].addedAt,
      }))

      return {
        success: true,
        shorts: result,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not load playlist Shorts.'),
        shorts: [],
      }
    }
  },

  async deletePlaylist(id) {
    try {
      const client = getClient()
      const user = await getCurrentUser()

      requireId(id, 'Playlist ID')

      const { error } = await client
        .from(PLAYLISTS_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Could not delete playlist.'),
      }
    }
  },
}

export default shortService
