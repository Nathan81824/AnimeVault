
import { create } from 'zustand'
import animeService from './animeService'

const getErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.message || (typeof error === 'string' ? error : fallback)

const getServiceMethod = (methodName) => {
  const method = animeService?.[methodName]

  if (typeof method !== 'function') {
    throw new Error(`Anime service method "${methodName}" is not available.`)
  }

  return method
}

const updateById = (items, updatedItem) => {
  if (!updatedItem?.id) return items

  const exists = items.some((item) => item.id === updatedItem.id)

  return exists
    ? items.map((item) =>
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      )
    : [updatedItem, ...items]
}

const updateByAnimeId = (items, updatedItem) => {
  if (!updatedItem?.anime_id) return items

  const exists = items.some(
    (item) => String(item.anime_id) === String(updatedItem.anime_id)
  )

  return exists
    ? items.map((item) =>
        String(item.anime_id) === String(updatedItem.anime_id)
          ? { ...item, ...updatedItem }
          : item
      )
    : [updatedItem, ...items]
}

const removeById = (items, id) =>
  items.filter((item) => item.id !== id)

export const useAnimeStore = create((set, get) => ({
  watchProgress: [],
  progressLoaded: false,

  reviews: [],
  achievements: [],
  watchParties: [],
  currentWatchParty: null,

  loading: {
    progress: false,
    reviews: false,
    achievements: false,
    parties: false,
    action: false,
  },

  error: null,
  message: null,

  setLoading: (key, value) =>
    set((state) => ({
      loading: {
        ...state.loading,
        [key]: value,
      },
    })),

  setError: (error) =>
    set({
      error: error ? getErrorMessage(error) : null,
    }),

  clearAnimeMessages: () =>
    set({
      error: null,
      message: null,
    }),

  // ==========================================
  // WATCH PROGRESS
  // ==========================================

  fetchWatchProgress: async () => {
    set({
      progressLoaded: false,
    })

    get().setLoading('progress', true)
    get().clearAnimeMessages()

    try {
      const data = await getServiceMethod('getWatchProgress')()

      set({
        watchProgress: Array.isArray(data) ? data : [],
        progressLoaded: true,
      })

      return {
        success: true,
        data,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      set({
        progressLoaded: true,
      })

      get().setLoading('progress', false)
    }
  },

  saveWatchProgress: async (progress) => {
    if (!progress?.anime_id) {
      return {
        success: false,
        error: 'An anime ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const savedProgress = await getServiceMethod(
        'upsertWatchProgress'
      )(progress)

      if (savedProgress) {
        set((state) => ({
          watchProgress: updateByAnimeId(
            state.watchProgress,
            savedProgress
          ),
          message: 'Watch progress saved.',
        }))
      }

      return {
        success: true,
        data: savedProgress,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  removeWatchProgress: async (animeId) => {
    if (!animeId) {
      return {
        success: false,
        error: 'An anime ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      await getServiceMethod('deleteWatchProgress')(animeId)

      set((state) => ({
        watchProgress: state.watchProgress.filter(
          (item) => String(item.anime_id) !== String(animeId)
        ),
        message: 'Watch progress removed.',
      }))

      return {
        success: true,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  // ==========================================
  // ANIME REVIEWS
  // ==========================================

  fetchReviews: async (animeId = null) => {
    get().setLoading('reviews', true)
    get().clearAnimeMessages()

    try {
      const data = await getServiceMethod('getAnimeReviews')(animeId)

      set({
        reviews: Array.isArray(data) ? data : [],
      })

      return {
        success: true,
        data,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('reviews', false)
    }
  },

  createReview: async (review) => {
    if (!review?.anime_id || !review?.rating || !review?.review?.trim()) {
      return {
        success: false,
        error: 'Anime, rating and review are required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const newReview = await getServiceMethod('createAnimeReview')(review)

      if (newReview) {
        set((state) => ({
          reviews: updateById(state.reviews, newReview),
          message: 'Your review has been published.',
        }))
      }

      return {
        success: true,
        data: newReview,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  updateReview: async (reviewId, updates) => {
    if (!reviewId) {
      return {
        success: false,
        error: 'A review ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const updatedReview = await getServiceMethod(
        'updateAnimeReview'
      )(reviewId, updates)

      if (updatedReview) {
        set((state) => ({
          reviews: updateById(state.reviews, updatedReview),
          message: 'Review updated.',
        }))
      }

      return {
        success: true,
        data: updatedReview,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  deleteReview: async (reviewId) => {
    if (!reviewId) {
      return {
        success: false,
        error: 'A review ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      await getServiceMethod('deleteAnimeReview')(reviewId)

      set((state) => ({
        reviews: removeById(state.reviews, reviewId),
        message: 'Review deleted.',
      }))

      return {
        success: true,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  // ==========================================
  // ACHIEVEMENTS
  // ==========================================

  fetchAchievements: async () => {
    get().setLoading('achievements', true)
    get().clearAnimeMessages()

    try {
      const data = await getServiceMethod('getAchievements')()

      set({
        achievements: Array.isArray(data) ? data : [],
      })

      return {
        success: true,
        data,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('achievements', false)
    }
  },

  unlockAchievement: async (achievement) => {
    if (!achievement?.achievement_key || !achievement?.title) {
      return {
        success: false,
        error: 'Achievement key and title are required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const unlocked = await getServiceMethod('unlockAchievement')(
        achievement
      )

      if (unlocked) {
        set((state) => ({
          achievements: updateById(state.achievements, unlocked),
          message: 'Achievement unlocked!',
        }))
      }

      return {
        success: true,
        data: unlocked,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  // ==========================================
  // WATCH PARTIES
  // ==========================================

  fetchMyWatchParties: async () => {
    get().setLoading('parties', true)
    get().clearAnimeMessages()

    try {
      const data = await getServiceMethod('getMyWatchParties')()

      set({
        watchParties: Array.isArray(data) ? data : [],
      })

      return {
        success: true,
        data,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('parties', false)
    }
  },

  createWatchParty: async (party) => {
    if (!party?.anime_id || !party?.anime_title) {
      return {
        success: false,
        error: 'Anime information is required to create a party.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const newParty = await getServiceMethod('createWatchParty')(party)

      if (newParty) {
        set((state) => ({
          watchParties: updateById(state.watchParties, newParty),
          currentWatchParty: newParty,
          message: 'Watch party created.',
        }))
      }

      return {
        success: true,
        data: newParty,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  joinWatchParty: async (inviteCode) => {
    if (!inviteCode?.trim()) {
      return {
        success: false,
        error: 'Enter a watch party invite code.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const party = await getServiceMethod('joinWatchParty')(
        inviteCode.trim()
      )

      if (party) {
        set((state) => ({
          watchParties: updateById(state.watchParties, party),
          currentWatchParty: party,
          message: 'You joined the watch party.',
        }))
      }

      return {
        success: true,
        data: party,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  fetchWatchParty: async (partyId) => {
    if (!partyId) {
      return {
        success: false,
        error: 'A party ID is required.',
      }
    }

    get().setLoading('parties', true)
    get().clearAnimeMessages()

    try {
      const party = await getServiceMethod('getWatchParty')(partyId)

      set({
        currentWatchParty: party || null,
      })

      return {
        success: true,
        data: party,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('parties', false)
    }
  },

  updateWatchParty: async (partyId, updates) => {
    if (!partyId) {
      return {
        success: false,
        error: 'A party ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      const updatedParty = await getServiceMethod('updateWatchParty')(
        partyId,
        updates
      )

      if (updatedParty) {
        set((state) => ({
          watchParties: updateById(state.watchParties, updatedParty),
          currentWatchParty:
            String(state.currentWatchParty?.id) === String(partyId)
              ? { ...state.currentWatchParty, ...updatedParty }
              : state.currentWatchParty,
          message: 'Watch party updated.',
        }))
      }

      return {
        success: true,
        data: updatedParty,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  leaveWatchParty: async (partyId) => {
    if (!partyId) {
      return {
        success: false,
        error: 'A party ID is required.',
      }
    }

    get().setLoading('action', true)
    get().clearAnimeMessages()

    try {
      await getServiceMethod('leaveWatchParty')(partyId)

      set((state) => ({
        watchParties: removeById(state.watchParties, partyId),
        currentWatchParty:
          String(state.currentWatchParty?.id) === String(partyId)
            ? null
            : state.currentWatchParty,
        message: 'You left the watch party.',
      }))

      return {
        success: true,
      }
    } catch (error) {
      get().setError(error)

      return {
        success: false,
        error: getErrorMessage(error),
      }
    } finally {
      get().setLoading('action', false)
    }
  },

  clearCurrentWatchParty: () =>
    set({
      currentWatchParty: null,
    }),

  // ==========================================
  // RESET STORE
  // ==========================================

  resetAnimeStore: () =>
    set({
      watchProgress: [],
      progressLoaded: false,
      reviews: [],
      achievements: [],
      watchParties: [],
      currentWatchParty: null,

      loading: {
        progress: false,
        reviews: false,
        achievements: false,
        parties: false,
        action: false,
      },

      error: null,
      message: null,
    }),
}))

export default useAnimeStore
