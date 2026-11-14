
import { create } from 'zustand'
import { supabase } from '../../lib/supabase'
import shortService from './services/shortsService'

const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const VIEWS_TABLE = 'short_views'

const getErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.message || (typeof error === 'string' ? error : fallback)

const normalizeUrl = (value) =>
  typeof value === 'string' ? value.trim() : ''

function validateExternalUrl(value) {
  const input = normalizeUrl(value)

  if (!input) {
    return { success: false, error: 'Enter a video URL.', url: '' }
  }

  let url

  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
  } catch {
    return { success: false, error: 'Enter a valid video URL.', url: '' }
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname.includes('.') ||
    url.hostname.startsWith('.') ||
    url.hostname.endsWith('.') ||
    url.username ||
    url.password
  ) {
    return {
      success: false,
      error: 'Enter a valid HTTPS video URL.',
      url: '',
    }
  }

  return { success: true, url: url.href }
}

function getYouTubeVideoId(value) {
  if (!value) return null

  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const parts = parsed.pathname.split('/').filter(Boolean)

    let id = null

    if (host === 'youtu.be') {
      id = parts[0]
    } else if (
      [
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtube-nocookie.com',
      ].includes(host)
    ) {
      if (parsed.pathname === '/watch') {
        id = parsed.searchParams.get('v')
      } else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
        id = parts[1]
      }
    }

    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

function normalizeShort(short) {
  if (!short) return short

  return {
    ...short,
    videoUrl: short.videoUrl ?? short.video_url ?? null,
    youtubeUrl: short.youtubeUrl ?? short.youtube_url ?? null,
    thumbnailUrl: short.thumbnailUrl ?? short.thumbnail_url ?? null,
    userId: short.userId ?? short.user_id ?? null,
    likeCount: Number(short.likeCount ?? short.like_count ?? 0),
    commentCount: Number(short.commentCount ?? short.comment_count ?? 0),
    viewCount: Number(short.viewCount ?? short.view_count ?? 0),
    createdAt: short.createdAt ?? short.created_at ?? null,
    updatedAt: short.updatedAt ?? short.updated_at ?? null,
    scheduledAt: short.scheduledAt ?? short.scheduled_at ?? null,
    publishedAt: short.publishedAt ?? short.published_at ?? null,
  }
}

function uniqueShorts(shorts) {
  const seen = new Set()

  return shorts.filter((short) => {
    if (!short?.id || seen.has(short.id)) return false
    seen.add(short.id)
    return true
  })
}

function updateShortInList(shorts, shortId, changes) {
  return shorts.map((short) =>
    short.id === shortId ? { ...short, ...changes } : short,
  )
}

function updateShortEverywhere(state, shortId, changes) {
  return {
    shorts: updateShortInList(state.shorts, shortId, changes),
    myShorts: updateShortInList(state.myShorts, shortId, changes),
    currentShort:
      state.currentShort?.id === shortId
        ? { ...state.currentShort, ...changes }
        : state.currentShort,
  }
}

function removeShortEverywhere(state, shortId) {
  const commentsByShortId = { ...state.commentsByShortId }
  delete commentsByShortId[shortId]

  return {
    shorts: state.shorts.filter((short) => short.id !== shortId),
    myShorts: state.myShorts.filter((short) => short.id !== shortId),
    currentShort:
      state.currentShort?.id === shortId ? null : state.currentShort,
    likedShortIds: state.likedShortIds.filter((id) => id !== shortId),
    commentsByShortId,
  }
}

function failedResult(error, extra = {}) {
  return { success: false, error, ...extra }
}

function serviceMethod(name) {
  const method = shortService?.[name]

  if (typeof method !== 'function') {
    throw new Error(`shortService.${name} is missing. Check shortsService.js.`)
  }

  return method
}

async function getExactCount(table, shortId) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('short_id', shortId)

  if (error) throw error

  return count ?? 0
}

async function getShortCounts(short) {
  if (!short?.id) return normalizeShort(short)

  const fallback = normalizeShort(short)

  const [likes, comments, views] = await Promise.all([
    getExactCount(LIKES_TABLE, short.id).catch(() => fallback.likeCount),
    getExactCount(COMMENTS_TABLE, short.id).catch(
      () => fallback.commentCount,
    ),
    getExactCount(VIEWS_TABLE, short.id).catch(() => fallback.viewCount),
  ])

  return {
    ...fallback,
    likeCount: likes,
    like_count: likes,
    commentCount: comments,
    comment_count: comments,
    viewCount: views,
    view_count: views,
  }
}

async function getShortsWithCounts(shorts) {
  return Promise.all((shorts || []).map(getShortCounts))
}

function countChanges({ likes, comments, views }) {
  return {
    likeCount: likes,
    like_count: likes,
    commentCount: comments,
    comment_count: comments,
    viewCount: views,
    view_count: views,
  }
}

export const useShortStore = create((set, get) => ({
  shorts: [],
  myShorts: [],
  currentShort: null,

  isLoading: false,
  isUploading: false,
  isLoadingMyShorts: false,
  isLoadingComments: false,

  likedShortIds: [],
  subscribedCreatorIds: [],
  commentsByShortId: {},

  error: null,
  message: null,

  clearMessages: () => set({ error: null, message: null }),

  // SHORTS FEED

  fetchShorts: async ({ limit = 20, offset = 0, append = false } = {}) => {
    set({ isLoading: true, error: null })

    try {
      const result = await serviceMethod('getPublishedShorts')({
        limit,
        offset,
      })

      if (!result?.success) {
        const error = result?.error || 'Unable to load Shorts.'
        set({ isLoading: false, error })
        return failedResult(error, { shorts: [] })
      }

      const fetchedShorts = await getShortsWithCounts(result.shorts || [])

      set((state) => ({
        shorts: append
          ? uniqueShorts([...state.shorts, ...fetchedShorts])
          : uniqueShorts(fetchedShorts),
        isLoading: false,
        error: null,
      }))

      return { ...result, shorts: fetchedShorts }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load Shorts.')
      set({ isLoading: false, error: message })
      return failedResult(message, { shorts: [] })
    }
  },

  // CREATE SHORT FROM VIDEO FILE

  createShort: async ({
    file,
    title = '',
    caption = '',
    thumbnailUrl = null,
    duration = null,
    publish = true,
  } = {}) => {
    if (!file) {
      const error = 'Choose a video file first.'
      set({ error, message: null })
      return failedResult(error, { short: null })
    }

    if (!normalizeUrl(title)) {
      const error = 'Enter a title for your Short.'
      set({ error, message: null })
      return failedResult(error, { short: null })
    }

    set({ isUploading: true, error: null, message: null })

    try {
      const result = await serviceMethod('createShort')({
        video: file,
        title: title.trim(),
        caption,
        thumbnail: thumbnailUrl,
        duration,
        publish,
      })

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to create your Short.'
        set({ isUploading: false, error })
        return failedResult(error, { short: null })
      }

      const createdShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        myShorts: uniqueShorts([createdShort, ...state.myShorts]),
        shorts:
          createdShort.status === 'published'
            ? uniqueShorts([createdShort, ...state.shorts])
            : state.shorts,
        isUploading: false,
        error: null,
        message:
          createdShort.status === 'published'
            ? 'Your Short has been published!'
            : 'Your Short has been saved as a draft.',
      }))

      return { ...result, short: createdShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create your Short.')
      set({ isUploading: false, error: message })
      return failedResult(message, { short: null })
    }
  },

  // CREATE SHORT FROM EXTERNAL LINK

  createShortFromLink: async ({
    url,
    youtubeUrl,
    videoUrl,
    title = '',
    caption = '',
    thumbnailUrl = null,
    duration = null,
    publish = true,
  } = {}) => {
    const validated = validateExternalUrl(url || videoUrl || youtubeUrl)

    if (!validated.success) {
      set({ error: validated.error, message: null })
      return failedResult(validated.error, { short: null })
    }

    if (!normalizeUrl(title)) {
      const error = 'Enter a title for your linked Short.'
      set({ error, message: null })
      return failedResult(error, { short: null })
    }

    const sourceUrl = validated.url
    const youtubeId = getYouTubeVideoId(sourceUrl)

    set({ isUploading: true, error: null, message: null })

    try {
      const result = await serviceMethod('createShortFromLink')({
        url: sourceUrl,
        videoUrl: sourceUrl,
        ...(youtubeId ? { youtubeUrl: sourceUrl, youtubeId } : {}),
        title: title.trim(),
        caption,
        thumbnailUrl,
        duration,
        publish,
      })

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to save this video link.'
        set({ isUploading: false, error })
        return failedResult(error, { short: null })
      }

      const createdShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        myShorts: uniqueShorts([createdShort, ...state.myShorts]),
        shorts:
          createdShort.status === 'published'
            ? uniqueShorts([createdShort, ...state.shorts])
            : state.shorts,
        isUploading: false,
        error: null,
        message:
          createdShort.status === 'published'
            ? 'Your linked Short has been published!'
            : 'Your linked Short has been saved as a draft.',
      }))

      return { ...result, short: createdShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save this video link.')
      set({ isUploading: false, error: message })
      return failedResult(message, { short: null })
    }
  },

  // CREATE SHORT FROM IMAGES AND AUDIO

  createShortFromMedia: async (options = {}) => {
    const {
      images = [],
      audioFile = null,
      title = '',
      caption = '',
      duration = 30,
      imageDurations = [],
      publish = true,
    } = options

    if (!images.length) {
      const error = 'Add at least one picture.'
      set({ error, message: null })
      return failedResult(error, { short: null })
    }

    set({ isUploading: true, error: null, message: null })

    try {
      const result = await serviceMethod('createShortFromMedia')({
        images,
        audioFile,
        title,
        caption,
        duration,
        imageDurations,
        publish,
      })

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to create your video.'
        set({ isUploading: false, error })
        return failedResult(error, { short: null })
      }

      const createdShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        myShorts: uniqueShorts([createdShort, ...state.myShorts]),
        shorts:
          createdShort.status === 'published'
            ? uniqueShorts([createdShort, ...state.shorts])
            : state.shorts,
        isUploading: false,
        error: null,
        message:
          createdShort.status === 'published'
            ? 'Your video has been published!'
            : 'Your video has been saved as a draft.',
      }))

      return { ...result, short: createdShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create your video.')
      set({ isUploading: false, error: message })
      return failedResult(message, { short: null })
    }
  },

  // MY SHORTS

  fetchMyShorts: async () => {
    set({ isLoadingMyShorts: true, error: null })

    try {
      const result = await serviceMethod('getMyShorts')()

      if (!result?.success) {
        const error = result?.error || 'Unable to load your Shorts.'
        set({ isLoadingMyShorts: false, error })
        return failedResult(error, { shorts: [] })
      }

      const myShorts = await getShortsWithCounts(result.shorts || [])

      set({ myShorts, isLoadingMyShorts: false, error: null })

      return { ...result, shorts: myShorts }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load your Shorts.')
      set({ isLoadingMyShorts: false, error: message })
      return failedResult(message, { shorts: [] })
    }
  },

  fetchShortById: async (id) => {
    if (!id) return failedResult('A Short ID is required.', { short: null })

    set({ isLoading: true, error: null })

    try {
      const result = await serviceMethod('getShortById')(id)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to load this Short.'
        set({ currentShort: null, isLoading: false, error })
        return failedResult(error, { short: null })
      }

      const currentShort = await getShortCounts(normalizeShort(result.short))

      set({ currentShort, isLoading: false, error: null })

      return { ...result, short: currentShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load this Short.')
      set({ currentShort: null, isLoading: false, error: message })
      return failedResult(message, { short: null })
    }
  },

  // PUBLISH SHORT

  publishShort: async (id) => {
    if (!id) return failedResult('A Short ID is required.', { short: null })

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('publishShort')(id)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to publish your Short.'
        set({ error })
        return failedResult(error, { short: null })
      }

      const publishedShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        myShorts: uniqueShorts([
          publishedShort,
          ...state.myShorts.filter((short) => short.id !== id),
        ]),
        shorts: uniqueShorts([
          publishedShort,
          ...state.shorts.filter((short) => short.id !== id),
        ]),
        currentShort:
          state.currentShort?.id === id ? publishedShort : state.currentShort,
        error: null,
        message: 'Your Short is now published!',
      }))

      return { ...result, short: publishedShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to publish your Short.')
      set({ error: message })
      return failedResult(message, { short: null })
    }
  },

  // SCHEDULE SHORT

  scheduleShort: async (id, scheduledAt) => {
    if (!id) return failedResult('A Short ID is required.', { short: null })

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('scheduleShort')(id, scheduledAt)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to schedule your Short.'
        set({ error })
        return failedResult(error, { short: null })
      }

      const scheduledShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        shorts: updateShortInList(state.shorts, id, scheduledShort),
        myShorts: updateShortInList(state.myShorts, id, scheduledShort),
        currentShort:
          state.currentShort?.id === id ? scheduledShort : state.currentShort,
        error: null,
        message: 'Your Short has been scheduled!',
      }))

      return { ...result, short: scheduledShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to schedule your Short.')
      set({ error: message })
      return failedResult(message, { short: null })
    }
  },

  // CANCEL SHORT SCHEDULE

  cancelShortSchedule: async (id) => {
    if (!id) return failedResult('A Short ID is required.', { short: null })

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('cancelShortSchedule')(id)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to cancel this schedule.'
        set({ error })
        return failedResult(error, { short: null })
      }

      const updatedShort = await getShortCounts(normalizeShort(result.short))

      set((state) => ({
        shorts: updateShortInList(state.shorts, id, updatedShort),
        myShorts: updateShortInList(state.myShorts, id, updatedShort),
        currentShort:
          state.currentShort?.id === id ? updatedShort : state.currentShort,
        error: null,
        message: 'Publishing schedule cancelled.',
      }))

      return { ...result, short: updatedShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to cancel this schedule.')
      set({ error: message })
      return failedResult(message, { short: null })
    }
  },

  deleteShort: async (id) => {
    if (!id) return failedResult('A Short ID is required.')

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('deleteShort')(id)

      if (!result?.success) {
        const error = result?.error || 'Unable to delete your Short.'
        set({ error })
        return failedResult(error)
      }

      set((state) => ({
        ...removeShortEverywhere(state, id),
        error: null,
        message: 'Short deleted successfully.',
      }))

      return result
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to delete your Short.')
      set({ error: message })
      return failedResult(message)
    }
  },

  // VIEWS

  recordView: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('recordView')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to record this view.' })
        return result
      }

      const views = await getExactCount(VIEWS_TABLE, shortId)

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          viewCount: views,
          view_count: views,
        }),
        error: null,
      }))

      return { ...result, viewCount: views }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to record this view.')
      set({ error: message })
      return failedResult(message)
    }
  },

  // LIKES

  checkLiked: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('hasLikedShort')(shortId)

      if (result?.success) {
        set((state) => ({
          likedShortIds: result.liked
            ? [...new Set([...state.likedShortIds, shortId])]
            : state.likedShortIds.filter((id) => id !== shortId),
        }))
      }

      return result
    } catch (error) {
      return failedResult(getErrorMessage(error, 'Unable to check like status.'))
    }
  },

  likeShort: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('likeShort')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to like this Short.' })
        return result
      }

      const likes = await getExactCount(LIKES_TABLE, shortId)

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          likeCount: likes,
          like_count: likes,
        }),
        likedShortIds: [...new Set([...state.likedShortIds, shortId])],
        error: null,
      }))

      return { ...result, likeCount: likes }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to like this Short.')
      set({ error: message })
      return failedResult(message)
    }
  },

  unlikeShort: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('unlikeShort')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to unlike this Short.' })
        return result
      }

      const likes = await getExactCount(LIKES_TABLE, shortId)

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          likeCount: likes,
          like_count: likes,
        }),
        likedShortIds: state.likedShortIds.filter((id) => id !== shortId),
        error: null,
      }))

      return { ...result, likeCount: likes }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to unlike this Short.')
      set({ error: message })
      return failedResult(message)
    }
  },

  // COMMENTS

  fetchComments: async (shortId, options = {}) => {
    if (!shortId) {
      return failedResult('A Short ID is required.', { comments: [] })
    }

    set({ isLoadingComments: true, error: null })

    try {
      const result = await serviceMethod('getComments')(shortId, options)

      if (!result?.success) {
        const error = result?.error || 'Unable to load comments.'
        set({ isLoadingComments: false, error })
        return failedResult(error, { comments: [] })
      }

      const comments = result.comments || []
      const commentCount = await getExactCount(COMMENTS_TABLE, shortId)

      set((state) => ({
        commentsByShortId: {
          ...state.commentsByShortId,
          [shortId]: comments,
        },
        ...updateShortEverywhere(state, shortId, {
          commentCount,
          comment_count: commentCount,
        }),
        isLoadingComments: false,
        error: null,
      }))

      return { ...result, comments, commentCount }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load comments.')
      set({ isLoadingComments: false, error: message })
      return failedResult(message, { comments: [] })
    }
  },

  addComment: async (shortId, content) => {
    if (!shortId || typeof content !== 'string' || !content.trim()) {
      return failedResult('A Short ID and comment are required.')
    }

    try {
      const result = await serviceMethod('addComment')(
        shortId,
        content.trim(),
      )

      if (!result?.success || !result.comment) {
        set({ error: result?.error || 'Unable to add your comment.' })
        return result
      }

      const commentCount = await getExactCount(COMMENTS_TABLE, shortId)

      set((state) => {
        const existing = state.commentsByShortId[shortId] || []

        return {
          commentsByShortId: {
            ...state.commentsByShortId,
            [shortId]: [
              result.comment,
              ...existing.filter(
                (comment) => comment.id !== result.comment.id,
              ),
            ],
          },
          ...updateShortEverywhere(state, shortId, {
            commentCount,
            comment_count: commentCount,
          }),
          error: null,
          message: 'Comment added.',
        }
      })

      return { ...result, commentCount }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to add your comment.')
      set({ error: message })
      return failedResult(message)
    }
  },

  deleteComment: async (shortIdOrCommentId, possibleCommentId) => {
    const commentId = possibleCommentId || shortIdOrCommentId

    if (!commentId) return failedResult('A comment ID is required.')

    try {
      const shortId =
        possibleCommentId && shortIdOrCommentId
          ? shortIdOrCommentId
          : Object.keys(get().commentsByShortId).find((id) =>
              get().commentsByShortId[id].some(
                (comment) => comment.id === commentId,
              ),
            )

      const result = await serviceMethod('deleteComment')(commentId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to delete your comment.' })
        return result
      }

      if (!shortId) {
        return {
          ...result,
          message: 'Comment deleted. Refresh comments to update the count.',
        }
      }

      const commentCount = await getExactCount(COMMENTS_TABLE, shortId)

      set((state) => ({
        commentsByShortId: {
          ...state.commentsByShortId,
          [shortId]: (state.commentsByShortId[shortId] || []).filter(
            (comment) => comment.id !== commentId,
          ),
        },
        ...updateShortEverywhere(state, shortId, {
          commentCount,
          comment_count: commentCount,
        }),
        error: null,
        message: 'Comment deleted.',
      }))

      return { ...result, commentCount }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to delete your comment.')
      set({ error: message })
      return failedResult(message)
    }
  },

  // CREATOR SUBSCRIPTIONS

  checkSubscribed: async (creatorId) => {
    if (!creatorId) return failedResult('A creator ID is required.')

    try {
      const result = await serviceMethod('checkSubscribed')(creatorId)

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds: result.subscribed
            ? [...new Set([...state.subscribedCreatorIds, creatorId])]
            : state.subscribedCreatorIds.filter((id) => id !== creatorId),
        }))
      }

      return result
    } catch (error) {
      return failedResult(
        getErrorMessage(error, 'Unable to check subscription status.'),
      )
    }
  },

  subscribeToCreator: async (creatorId) => {
    if (!creatorId) return failedResult('A creator ID is required.')

    try {
      const result = await serviceMethod('subscribeToCreator')(creatorId)

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds: [
            ...new Set([...state.subscribedCreatorIds, creatorId]),
          ],
          error: null,
          message: 'You are now subscribed!',
        }))
      } else {
        set({ error: result?.error || 'Unable to subscribe.' })
      }

      return result
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to subscribe.')
      set({ error: message })
      return failedResult(message)
    }
  },

  unsubscribeFromCreator: async (creatorId) => {
    if (!creatorId) return failedResult('A creator ID is required.')

    try {
      const result = await serviceMethod('unsubscribeFromCreator')(creatorId)

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds: state.subscribedCreatorIds.filter(
            (id) => id !== creatorId,
          ),
          error: null,
          message: 'You have unsubscribed.',
        }))
      } else {
        set({ error: result?.error || 'Unable to unsubscribe.' })
      }

      return result
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to unsubscribe.')
      set({ error: message })
      return failedResult(message)
    }
  },

  // SAVED SHORTS

  saveShort: async (shortId) => {
    try {
      const result = await serviceMethod('saveShort')(shortId)
      if (!result?.success) return result
      return result
    } catch (error) {
      return failedResult(getErrorMessage(error, 'Unable to save Short.'))
    }
  },

  unsaveShort: async (shortId) => {
    try {
      return await serviceMethod('unsaveShort')(shortId)
    } catch (error) {
      return failedResult(getErrorMessage(error, 'Unable to unsave Short.'))
    }
  },

  // RESET

  clearCurrentShort: () => set({ currentShort: null }),

  resetShorts: () => {
    set({
      shorts: [],
      myShorts: [],
      currentShort: null,
      isLoading: false,
      isUploading: false,
      isLoadingMyShorts: false,
      isLoadingComments: false,
      likedShortIds: [],
      subscribedCreatorIds: [],
      commentsByShortId: {},
      error: null,
      message: null,
    })
  },
}))

export default useShortStore
