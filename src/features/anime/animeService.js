
import { supabase } from '../../lib/supabase'

const TABLES = {
  progress: 'anime_watch_progress',
  reviews: 'anime_reviews',
  achievements: 'anime_achievements',
  parties: 'watch_parties',
  partyMembers: 'watch_party_members',
  profiles: 'profiles',
}

const JOIN_PARTY_FUNCTION = 'animevault_join_watch_party_v1'

const getErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.message || (typeof error === 'string' ? error : fallback)

const throwIfError = (error) => {
  if (error) {
    throw new Error(getErrorMessage(error))
  }
}

const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()

  throwIfError(error)

  if (!data?.user) {
    throw new Error('You must be signed in to perform this action.')
  }

  return data.user
}

const requireText = (value, fieldName) => {
  const result = String(value ?? '').trim()

  if (!result) {
    throw new Error(`${fieldName} is required.`)
  }

  return result
}

const toPositiveNumber = (value, fallback = 0) => {
  const number = Number(value)

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback
}

const generateInviteCode = () => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure invite code generation is unavailable.')
  }

  const bytes = new Uint8Array(6)
  globalThis.crypto.getRandomValues(bytes)

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

const attachReviewProfiles = async (reviews) => {
  if (!reviews?.length) return []

  const userIds = [
    ...new Set(reviews.map((review) => review.user_id).filter(Boolean)),
  ]

  if (!userIds.length) return reviews

  const { data: profiles, error } = await supabase
    .from(TABLES.profiles)
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)

  if (error) {
    return reviews
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile])
  )

  return reviews.map((review) => ({
    ...review,
    profile: profileMap.get(review.user_id) || null,
  }))
}

const getPartyWithMembers = async (partyId) => {
  const { data: party, error } = await supabase
    .from(TABLES.parties)
    .select('*')
    .eq('id', partyId)
    .single()

  throwIfError(error)

  const { data: members, error: membersError } = await supabase
    .from(TABLES.partyMembers)
    .select('id, party_id, user_id, role, joined_at')
    .eq('party_id', partyId)
    .order('joined_at', { ascending: true })

  throwIfError(membersError)

  return {
    ...party,
    members: members || [],
  }
}

const animeService = {
  // ==========================================
  // WATCH PROGRESS
  // ==========================================

  async getWatchProgress() {
    const user = await getCurrentUser()

    const { data, error } = await supabase
      .from(TABLES.progress)
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    throwIfError(error)

    return data || []
  },

  async upsertWatchProgress(progress) {
    const user = await getCurrentUser()

    const animeId = requireText(progress.anime_id, 'Anime ID')
    const animeTitle = requireText(progress.anime_title, 'Anime title')

    const episodeNumber = Math.floor(
      Number(progress.episode_number ?? 1)
    )

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error('Episode number must be at least 1.')
    }

    const positionSeconds = toPositiveNumber(progress.position_seconds)
    const durationSeconds = toPositiveNumber(progress.duration_seconds)

    const payload = {
      user_id: user.id,
      anime_id: animeId,
      anime_title: animeTitle,
      anime_image: progress.anime_image || null,
      episode_number: episodeNumber,
      position_seconds: positionSeconds,
      duration_seconds: durationSeconds,
      completed: Boolean(progress.completed),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from(TABLES.progress)
      .upsert(payload, {
        onConflict: 'user_id,anime_id',
      })
      .select()
      .single()

    throwIfError(error)

    return data
  },

  async deleteWatchProgress(animeId) {
    const user = await getCurrentUser()

    const { error } = await supabase
      .from(TABLES.progress)
      .delete()
      .eq('user_id', user.id)
      .eq('anime_id', String(animeId))

    throwIfError(error)

    return true
  },

  // ==========================================
  // ANIME REVIEWS
  // ==========================================

  async getAnimeReviews(animeId = null) {
    let query = supabase
      .from(TABLES.reviews)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (animeId !== null && animeId !== undefined) {
      query = query.eq('anime_id', String(animeId))
    }

    const { data, error } = await query

    throwIfError(error)

    return attachReviewProfiles(data || [])
  },

  async createAnimeReview(review) {
    const user = await getCurrentUser()

    const animeId = requireText(review.anime_id, 'Anime ID')
    const animeTitle = requireText(review.anime_title, 'Anime title')
    const reviewText = requireText(review.review, 'Review')

    const rating = Number(review.rating)

    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
      throw new Error('Rating must be between 1 and 10.')
    }

    const payload = {
      user_id: user.id,
      anime_id: animeId,
      anime_title: animeTitle,
      anime_image: review.anime_image || null,
      rating,
      review: reviewText,
      is_public: review.is_public !== false,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from(TABLES.reviews)
      .upsert(payload, {
        onConflict: 'user_id,anime_id',
      })
      .select()
      .single()

    throwIfError(error)

    const [reviewWithProfile] = await attachReviewProfiles([data])

    return reviewWithProfile
  },

  async updateAnimeReview(reviewId, updates) {
    const user = await getCurrentUser()

    const payload = {
      updated_at: new Date().toISOString(),
    }

    if (updates.rating !== undefined) {
      const rating = Number(updates.rating)

      if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
        throw new Error('Rating must be between 1 and 10.')
      }

      payload.rating = rating
    }

    if (updates.review !== undefined) {
      payload.review = requireText(updates.review, 'Review')
    }

    if (updates.is_public !== undefined) {
      payload.is_public = Boolean(updates.is_public)
    }

    const { data, error } = await supabase
      .from(TABLES.reviews)
      .update(payload)
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single()

    throwIfError(error)

    const [reviewWithProfile] = await attachReviewProfiles([data])

    return reviewWithProfile
  },

  async deleteAnimeReview(reviewId) {
    const user = await getCurrentUser()

    const { error } = await supabase
      .from(TABLES.reviews)
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    throwIfError(error)

    return true
  },

  // ==========================================
  // ACHIEVEMENTS
  // ==========================================

  async getAchievements() {
    const user = await getCurrentUser()

    const { data, error } = await supabase
      .from(TABLES.achievements)
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    throwIfError(error)

    return data || []
  },

  async unlockAchievement(achievement) {
    const user = await getCurrentUser()

    const achievementKey = requireText(
      achievement.achievement_key,
      'Achievement key'
    )

    const title = requireText(achievement.title, 'Achievement title')

    const payload = {
      user_id: user.id,
      achievement_key: achievementKey,
      title,
      description: achievement.description || null,
      icon: achievement.icon || null,
    }

    const { data, error } = await supabase
      .from(TABLES.achievements)
      .upsert(payload, {
        onConflict: 'user_id,achievement_key',
        ignoreDuplicates: true,
      })
      .select()
      .maybeSingle()

    throwIfError(error)

    if (data) return data

    const { data: existing, error: existingError } = await supabase
      .from(TABLES.achievements)
      .select('*')
      .eq('user_id', user.id)
      .eq('achievement_key', achievementKey)
      .single()

    throwIfError(existingError)

    return existing
  },

  // ==========================================
  // WATCH PARTIES
  // ==========================================

  async getMyWatchParties() {
    const user = await getCurrentUser()

    const { data: memberships, error: membershipsError } = await supabase
      .from(TABLES.partyMembers)
      .select('party_id')
      .eq('user_id', user.id)

    throwIfError(membershipsError)

    const memberPartyIds = (memberships || []).map(
      (membership) => membership.party_id
    )

    const { data: hostedParties, error: hostedError } = await supabase
      .from(TABLES.parties)
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })

    throwIfError(hostedError)

    let joinedParties = []

    if (memberPartyIds.length) {
      const { data, error } = await supabase
        .from(TABLES.parties)
        .select('*')
        .in('id', memberPartyIds)
        .order('created_at', { ascending: false })

      throwIfError(error)

      joinedParties = data || []
    }

    const partiesMap = new Map()

    ;[...(hostedParties || []), ...joinedParties].forEach((party) => {
      partiesMap.set(party.id, party)
    })

    return [...partiesMap.values()].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  },

  async createWatchParty(party) {
    const user = await getCurrentUser()

    const animeId = requireText(party.anime_id, 'Anime ID')
    const animeTitle = requireText(party.anime_title, 'Anime title')

    const episodeNumber = Math.floor(
      Number(party.episode_number ?? 1)
    )

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error('Episode number must be at least 1.')
    }

    const payload = {
      host_id: user.id,
      anime_id: animeId,
      anime_title: animeTitle,
      episode_number: episodeNumber,
      invite_code: generateInviteCode(),
      status: 'waiting',
      current_position_seconds: 0,
      is_private: party.is_private !== false,
    }

    const { data, error } = await supabase
      .from(TABLES.parties)
      .insert(payload)
      .select()
      .single()

    throwIfError(error)

    return {
      ...data,
      members: [],
    }
  },

  async joinWatchParty(inviteCode) {
    await getCurrentUser()

    const code = requireText(inviteCode, 'Invite code').toUpperCase()

    const { data: partyId, error } = await supabase.rpc(
      JOIN_PARTY_FUNCTION,
      {
        p_invite_code: code,
      }
    )

    throwIfError(error)

    if (!partyId) {
      throw new Error('Could not join this watch party.')
    }

    return getPartyWithMembers(partyId)
  },

  async getWatchParty(partyId) {
    await getCurrentUser()

    return getPartyWithMembers(partyId)
  },

  async updateWatchParty(partyId, updates) {
    const user = await getCurrentUser()

    const payload = {}

    if (updates.status !== undefined) {
      const allowedStatuses = ['waiting', 'active', 'ended']

      if (!allowedStatuses.includes(updates.status)) {
        throw new Error('Invalid watch party status.')
      }

      payload.status = updates.status
    }

    if (updates.episode_number !== undefined) {
      const episodeNumber = Math.floor(Number(updates.episode_number))

      if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
        throw new Error('Episode number must be at least 1.')
      }

      payload.episode_number = episodeNumber
    }

    if (updates.current_position_seconds !== undefined) {
      payload.current_position_seconds = toPositiveNumber(
        updates.current_position_seconds
      )
    }

    if (updates.is_private !== undefined) {
      payload.is_private = Boolean(updates.is_private)
    }

    if (updates.anime_title !== undefined) {
      payload.anime_title = requireText(
        updates.anime_title,
        'Anime title'
      )
    }

    if (updates.anime_id !== undefined) {
      payload.anime_id = requireText(updates.anime_id, 'Anime ID')
    }

    if (!Object.keys(payload).length) {
      throw new Error('No valid watch party updates were provided.')
    }

    payload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from(TABLES.parties)
      .update(payload)
      .eq('id', partyId)
      .eq('host_id', user.id)
      .select()
      .single()

    throwIfError(error)

    return getPartyWithMembers(data.id)
  },

  async leaveWatchParty(partyId) {
    const user = await getCurrentUser()

    const { data: party, error: partyError } = await supabase
      .from(TABLES.parties)
      .select('id, host_id')
      .eq('id', partyId)
      .single()

    throwIfError(partyError)

    if (party.host_id === user.id) {
      const { error } = await supabase
        .from(TABLES.parties)
        .update({
          status: 'ended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partyId)
        .eq('host_id', user.id)

      throwIfError(error)

      return true
    }

    const { error } = await supabase
      .from(TABLES.partyMembers)
      .delete()
      .eq('party_id', partyId)
      .eq('user_id', user.id)

    throwIfError(error)

    return true
  },
}

export default animeService
