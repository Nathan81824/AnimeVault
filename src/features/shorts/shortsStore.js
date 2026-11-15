
import { create } from 'zustand'
import { supabase } from '../../lib/supabase'
import shortService from './services/shortsService'

const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const VIEWS_TABLE = 'short_views'
const COUNT_PAGE_SIZE = 1000

const getErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.message || (typeof error === 'string' ? error : fallback)

const normalizeUrl = (value) =>
  typeof value === 'string' ? value.trim() : ''

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

function uniqueShorts(shorts = []) {
  const seen = new Set()

  return shorts.filter((short) => {
    if (!short?.id || seen.has(String(short.id))) return false
    seen.add(String(short.id))
    return true
  })
}

function shuffleShorts(items = [], previousItems = []) {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const sameOrder =
    shuffled.length > 1 &&
    shuffled.every(
      (item, index) =>
        String(item.id) === String(previousItems[index]?.id),
    )

  if (sameOrder) {
    ;[shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
  }

  return shuffled
}

function updateShortInList(shorts = [], shortId, changes) {
  return shorts.map((short) =>
    String(short.id) === String(shortId)
      ? { ...short, ...changes }
      : short,
  )
}

function updateShortEverywhere(state, shortId, changes) {
  return {
    shorts: updateShortInList(state.shorts, shortId, changes),
    myShorts: updateShortInList(state.myShorts, shortId, changes),
    currentShort:
      String(state.currentShort?.id) === String(shortId)
        ? { ...state.currentShort, ...changes }
        : state.currentShort,
  }
}

function removeShortEverywhere(state, shortId) {
  const commentsByShortId = { ...state.commentsByShortId }
  delete commentsByShortId[shortId]

  return {
    shorts: state.shorts.filter(
      (short) => String(short.id) !== String(shortId),
    ),
    myShorts: state.myShorts.filter(
      (short) => String(short.id) !== String(shortId),
    ),
    currentShort:
      String(state.currentShort?.id) === String(shortId)
        ? null
        : state.currentShort,
    likedShortIds: state.likedShortIds.filter(
      (id) => String(id) !== String(shortId),
    ),
    commentsByShortId,
  }
}

function failedResult(error, extra = {}) {
  return { success: false, error, ...extra }
}

function serviceMethod(name) {
  const method = shortService?.[name]

  if (typeof method !== 'function') {
    throw new Error(
      `shortService.${name} is missing. Check shortsService.js.`,
    )
  }

  return method
}

function validateExternalUrl(value) {
  const input = normalizeUrl(value)

  if (!input) {
    return { success: false, error: 'Enter a video URL.', url: '' }
  }

  let url

  try {
    url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    )
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

async function getTableCounts(table, shortIds) {
  const counts = new Map()

  if (!shortIds.length) return counts

  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('short_id')
      .in('short_id', shortIds)
      .range(offset, offset + COUNT_PAGE_SIZE - 1)

    if (error) throw error

    const rows = data || []

    for (const row of rows) {
      counts.set(
        row.short_id,
        (counts.get(row.short_id) || 0) + 1,
      )
    }

    if (rows.length < COUNT_PAGE_SIZE) break

    offset += COUNT_PAGE_SIZE
  }

  return counts
}

async function getShortsWithCounts(shorts = []) {
  const normalized = uniqueShorts(shorts.map(normalizeShort))

  if (!normalized.length) return []

  const shortIds = normalized.map((short) => short.id)

  const [likes, comments, views] = await Promise.all([
    getTableCounts(LIKES_TABLE, shortIds),
    getTableCounts(COMMENTS_TABLE, shortIds),
    getTableCounts(VIEWS_TABLE, shortIds),
  ])

  return normalized.map((short) => {
    const likeCount = likes.get(short.id) ?? short.likeCount
    const commentCount = comments.get(short.id) ?? short.commentCount
    const viewCount = views.get(short.id) ?? short.viewCount

    return {
      ...short,
      likeCount,
      like_count: likeCount,
      commentCount,
      comment_count: commentCount,
      viewCount,
      view_count: viewCount,
    }
  })
}

async function getShortCounts(short) {
  if (!short?.id) return normalizeShort(short)

  const [result] = await getShortsWithCounts([short])

  return result
}

function countChanges({ likes, comments, views }) {
  return {
    ...(likes !== undefined && {
      likeCount: likes,
      like_count: likes,
    }),
    ...(comments !== undefined && {
      commentCount: comments,
      comment_count: comments,
    }),
    ...(views !== undefined && {
      viewCount: views,
      view_count: views,
    }),
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

  setShorts: (shorts) =>
    set({
      shorts: uniqueShorts((shorts || []).map(normalizeShort)),
    }),

  appendShorts: (shorts) =>
    set((state) => ({
      shorts: uniqueShorts([
        ...state.shorts,
        ...(shorts || []).map(normalizeShort),
      ]),
    })),

  updateShort: (shortId, changes) =>
    set((state) => updateShortEverywhere(state, shortId, changes)),

  fetchShorts: async ({
    limit = 20,
    offset = 0,
    append = false,
  } = {}) => {
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

      const fetchedShorts = await getShortsWithCounts(
        result.shorts || [],
      )

      const currentShorts = get().shorts

      const updatedShorts = append
        ? uniqueShorts([...currentShorts, ...fetchedShorts])
        : shuffleShorts(fetchedShorts, currentShorts)

      set({
        shorts: updatedShorts,
        isLoading: false,
        error: null,
      })

      return {
        ...result,
        shorts: append ? fetchedShorts : updatedShorts,
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load Shorts.')

      set({ isLoading: false, error: message })

      return failedResult(message, { shorts: [] })
    }
  },

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

      const createdShort = normalizeShort(result.short)

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
    const validated = validateExternalUrl(
      url || videoUrl || youtubeUrl,
    )

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
        ...(youtubeId
          ? { youtubeUrl: sourceUrl, youtubeId }
          : {}),
        title: title.trim(),
        caption,
        thumbnailUrl,
        duration,
        publish,
      })

      if (!result?.success || !result.short) {
        const error =
          result?.error || 'Unable to save this video link.'

        set({ isUploading: false, error })

        return failedResult(error, { short: null })
      }

      const createdShort = normalizeShort(result.short)

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
      const message = getErrorMessage(
        error,
        'Unable to save this video link.',
      )

      set({ isUploading: false, error: message })

      return failedResult(message, { short: null })
    }
  },

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

      const createdShort = normalizeShort(result.short)

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
      const message = getErrorMessage(
        error,
        'Unable to create your video.',
      )

      set({ isUploading: false, error: message })

      return failedResult(message, { short: null })
    }
  },

  fetchMyShorts: async () => {
    set({ isLoadingMyShorts: true, error: null })

    try {
      const result = await serviceMethod('getMyShorts')()

      if (!result?.success) {
        const error = result?.error || 'Unable to load your Shorts.'

        set({ isLoadingMyShorts: false, error })

        return failedResult(error, { shorts: [] })
      }

      const myShorts = await getShortsWithCounts(
        result.shorts || [],
      )

      set({
        myShorts,
        isLoadingMyShorts: false,
        error: null,
      })

      return { ...result, shorts: myShorts }
    } catch (error) {
      const message = getErrorMessage(
        error,
        'Unable to load your Shorts.',
      )

      set({ isLoadingMyShorts: false, error: message })

      return failedResult(message, { shorts: [] })
    }
  },

  fetchShortById: async (id) => {
    if (!id) {
      return failedResult('A Short ID is required.', {
        short: null,
      })
    }

    set({ isLoading: true, error: null })

    try {
      const result = await serviceMethod('getShortById')(id)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to load this Short.'

        set({
          currentShort: null,
          isLoading: false,
          error,
        })

        return failedResult(error, { short: null })
      }

      const currentShort = await getShortCounts(
        normalizeShort(result.short),
      )

      set((state) => ({
        currentShort,
        shorts: uniqueShorts([
          ...state.shorts,
          currentShort,
        ]),
        isLoading: false,
        error: null,
      }))

      return { ...result, short: currentShort }
    } catch (error) {
      const message = getErrorMessage(
        error,
        'Unable to load this Short.',
      )

      set({
        currentShort: null,
        isLoading: false,
        error: message,
      })

      return failedResult(message, { short: null })
    }
  },

  publishShort: async (id) => {
    if (!id) {
      return failedResult('A Short ID is required.', {
        short: null,
      })
    }

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('publishShort')(id)

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to publish your Short.'

        set({ error })

        return failedResult(error, { short: null })
      }

      const publishedShort = normalizeShort(result.short)

      set((state) => ({
        myShorts: uniqueShorts([
          publishedShort,
          ...state.myShorts.filter(
            (short) => String(short.id) !== String(id),
          ),
        ]),
        shorts: uniqueShorts([
          publishedShort,
          ...state.shorts.filter(
            (short) => String(short.id) !== String(id),
          ),
        ]),
        currentShort:
          String(state.currentShort?.id) === String(id)
            ? publishedShort
            : state.currentShort,
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

  scheduleShort: async (id, scheduledAt) => {
    if (!id) {
      return failedResult('A Short ID is required.', {
        short: null,
      })
    }

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('scheduleShort')(
        id,
        scheduledAt,
      )

      if (!result?.success || !result.short) {
        const error = result?.error || 'Unable to schedule your Short.'

        set({ error })

        return failedResult(error, { short: null })
      }

      const scheduledShort = normalizeShort(result.short)

      set((state) => ({
        shorts: updateShortInList(
          state.shorts,
          id,
          scheduledShort,
        ),
        myShorts: updateShortInList(
          state.myShorts,
          id,
          scheduledShort,
        ),
        currentShort:
          String(state.currentShort?.id) === String(id)
            ? scheduledShort
            : state.currentShort,
        error: null,
        message: 'Your Short has been scheduled.',
      }))

      return { ...result, short: scheduledShort }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to schedule your Short.')

      set({ error: message })

      return failedResult(message, { short: null })
    }
  },

  cancelShortSchedule: async (id) => {
    if (!id) {
      return failedResult('A Short ID is required.', {
        short: null,
      })
    }

    set({ error: null, message: null })

    try {
      const result = await serviceMethod('cancelShortSchedule')(id)

      if (!result?.success || !result.short) {
        const error =
          result?.error || 'Unable to cancel this schedule.'

        set({ error })

        return failedResult(error, { short: null })
      }

      const updatedShort = normalizeShort(result.short)

      set((state) => ({
        shorts: updateShortInList(
          state.shorts,
          id,
          updatedShort,
        ),
        myShorts: updateShortInList(
          state.myShorts,
          id,
          updatedShort,
        ),
        currentShort:
          String(state.currentShort?.id) === String(id)
            ? updatedShort
            : state.currentShort,
        error: null,
        message: 'Publishing schedule cancelled.',
      }))

      return { ...result, short: updatedShort }
    } catch (error) {
      const message = getErrorMessage(
        error,
        'Unable to cancel this schedule.',
      )

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

  recordView: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('recordView')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to record this view.' })

        return result
      }

      const views = await getTableCounts(
        VIEWS_TABLE,
        [shortId],
      )

      const viewCount = views.get(shortId) ?? 0

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          ...countChanges({ views: viewCount }),
        }),
        error: null,
      }))

      return { ...result, viewCount }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to record this view.')

      set({ error: message })

      return failedResult(message)
    }
  },

  checkLiked: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('hasLikedShort')(shortId)

      if (result?.success) {
        set((state) => ({
          likedShortIds: result.liked
            ? [...new Set([...state.likedShortIds, shortId])]
            : state.likedShortIds.filter(
                (id) => String(id) !== String(shortId),
              ),
        }))
      }

      return result
    } catch (error) {
      return failedResult(
        getErrorMessage(error, 'Unable to check like status.'),
      )
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

      const likes = await getTableCounts(
        LIKES_TABLE,
        [shortId],
      )

      const likeCount = likes.get(shortId) ?? 0

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          ...countChanges({ likes: likeCount }),
        }),
        likedShortIds: [
          ...new Set([...state.likedShortIds, shortId]),
        ],
        error: null,
      }))

      return { ...result, likeCount }
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

      const likes = await getTableCounts(
        LIKES_TABLE,
        [shortId],
      )

      const likeCount = likes.get(shortId) ?? 0

      set((state) => ({
        ...updateShortEverywhere(state, shortId, {
          ...countChanges({ likes: likeCount }),
        }),
        likedShortIds: state.likedShortIds.filter(
          (id) => String(id) !== String(shortId),
        ),
        error: null,
      }))

      return { ...result, likeCount }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to unlike this Short.')

      set({ error: message })

      return failedResult(message)
    }
  },

  fetchComments: async (shortId, options = {}) => {
    if (!shortId) {
      return failedResult('A Short ID is required.', {
        comments: [],
      })
    }

    set({ isLoadingComments: true, error: null })

    try {
      const result = await serviceMethod('getComments')(
        shortId,
        options,
      )

      if (!result?.success) {
        const error = result?.error || 'Unable to load comments.'

        set({ isLoadingComments: false, error })

        return failedResult(error, { comments: [] })
      }

      const comments = result.comments || []
      const counts = await getTableCounts(
        COMMENTS_TABLE,
        [shortId],
      )
      const commentCount = counts.get(shortId) ?? 0

      set((state) => ({
        commentsByShortId: {
          ...state.commentsByShortId,
          [shortId]: comments,
        },
        ...updateShortEverywhere(state, shortId, {
          ...countChanges({ comments: commentCount }),
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
    if (
      !shortId ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
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

      const counts = await getTableCounts(
        COMMENTS_TABLE,
        [shortId],
      )
      const commentCount = counts.get(shortId) ?? 0

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
            ...countChanges({ comments: commentCount }),
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

    if (!commentId) {
      return failedResult('A comment ID is required.')
    }

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
        set({
          error: result?.error || 'Unable to delete your comment.',
        })

        return result
      }

      if (!shortId) {
        return {
          ...result,
          message:
            'Comment deleted. Refresh comments to update the count.',
        }
      }

      const counts = await getTableCounts(
        COMMENTS_TABLE,
        [shortId],
      )
      const commentCount = counts.get(shortId) ?? 0

      set((state) => ({
        commentsByShortId: {
          ...state.commentsByShortId,
          [shortId]: (
            state.commentsByShortId[shortId] || []
          ).filter((comment) => comment.id !== commentId),
        },
        ...updateShortEverywhere(state, shortId, {
          ...countChanges({ comments: commentCount }),
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

  checkSubscribed: async (creatorId) => {
    if (!creatorId) {
      return failedResult('A creator ID is required.')
    }

    try {
      const result = await serviceMethod('checkSubscribed')(
        creatorId,
      )

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds: result.subscribed
            ? [
                ...new Set([
                  ...state.subscribedCreatorIds,
                  creatorId,
                ]),
              ]
            : state.subscribedCreatorIds.filter(
                (id) => id !== creatorId,
              ),
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
    if (!creatorId) {
      return failedResult('A creator ID is required.')
    }

    try {
      const result = await serviceMethod('subscribeToCreator')(
        creatorId,
      )

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds: [
            ...new Set([
              ...state.subscribedCreatorIds,
              creatorId,
            ]),
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
    if (!creatorId) {
      return failedResult('A creator ID is required.')
    }

    try {
      const result = await serviceMethod('unsubscribeFromCreator')(
        creatorId,
      )

      if (result?.success) {
        set((state) => ({
          subscribedCreatorIds:
            state.subscribedCreatorIds.filter(
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

  saveShort: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('saveShort')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to save Short.' })
      } else {
        set({ error: null, message: result.message || 'Short saved.' })
      }

      return result
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save Short.')

      set({ error: message })

      return failedResult(message)
    }
  },

  unsaveShort: async (shortId) => {
    if (!shortId) return failedResult('A Short ID is required.')

    try {
      const result = await serviceMethod('unsaveShort')(shortId)

      if (!result?.success) {
        set({ error: result?.error || 'Unable to unsave Short.' })
      } else {
        set({ error: null, message: 'Short removed from My Vault.' })
      }

      return result
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to unsave Short.')

      set({ error: message })

      return failedResult(message)
    }
  },

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
