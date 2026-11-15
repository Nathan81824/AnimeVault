
import { supabase } from '../../../lib/supabase'
import profileService from '../../profile/profileService'

const SHORTS_TABLE = 'shorts'
const SUBSCRIPTIONS_TABLE = 'creator_subscriptions'
const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const VIEWS_TABLE = 'short_views'
const PAGE_SIZE = 1000

const getClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check your .env file.')
  }

  return supabase
}

const normalizeShort = (short) => {
  if (!short) return null

  return {
    ...short,
    id: short.id,
    userId: short.user_id,
    title: short.title || '',
    caption: short.caption || '',
    videoUrl: short.video_url || '',
    thumbnailUrl: short.thumbnail_url || null,
    status: short.status || 'draft',
    viewCount: 0,
    likeCount: Number(short.like_count || 0),
    commentsCount: 0,
    publishedAt: short.published_at || null,
    createdAt: short.created_at || null,
  }
}

const getRowsByShortIds = async (
  client,
  table,
  shortIds,
  creatorId = null,
) => {
  const rows = []

  if (!shortIds.length) return rows

  let start = 0

  while (true) {
    let query = client
      .from(table)
      .select('short_id')
      .in('short_id', shortIds)
      .range(start, start + PAGE_SIZE - 1)

    if (creatorId) {
      query = query.eq('user_id', creatorId)
    }

    const { data, error } = await query

    if (error) throw error

    const batch = data || []
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) break

    start += PAGE_SIZE
  }

  return rows
}

const getPublishedShorts = async (client) => {
  const shorts = []
  let start = 0

  while (true) {
    const { data, error } = await client
      .from(SHORTS_TABLE)
      .select('id, user_id')
      .eq('status', 'published')
      .range(start, start + PAGE_SIZE - 1)

    if (error) throw error

    const batch = data || []
    shorts.push(...batch)

    if (batch.length < PAGE_SIZE) break

    start += PAGE_SIZE
  }

  return shorts
}

const countByShortId = (rows) => {
  const counts = {}

  rows.forEach((row) => {
    counts[row.short_id] = (counts[row.short_id] || 0) + 1
  })

  return counts
}

const channelService = {
  async getChannels() {
    try {
      const client = getClient()

      const [profilesResult, subscriptionsResult, publishedShorts] =
        await Promise.all([
          client
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),

          client
            .from(SUBSCRIPTIONS_TABLE)
            .select('creator_id'),

          getPublishedShorts(client),
        ])

      if (profilesResult.error) throw profilesResult.error
      if (subscriptionsResult.error) throw subscriptionsResult.error

      const subscriberCounts = {}

      ;(subscriptionsResult.data || []).forEach((subscription) => {
        const creatorId = subscription.creator_id

        subscriberCounts[creatorId] =
          (subscriberCounts[creatorId] || 0) + 1
      })

      const shortIds = publishedShorts
        .map((short) => short.id)
        .filter(Boolean)

      const views = await getRowsByShortIds(
        client,
        VIEWS_TABLE,
        shortIds,
      )

      const viewCounts = countByShortId(views)
      const creatorViews = {}

      publishedShorts.forEach((short) => {
        const creatorId = short.user_id

        if (!creatorId) return

        creatorViews[creatorId] =
          (creatorViews[creatorId] || 0) +
          (viewCounts[short.id] || 0)
      })

      const channels = (profilesResult.data || []).map((profile) => ({
        id: profile.id,
        username: profile.username || '',
        displayName:
          profile.display_name ||
          profile.username ||
          'Anime Vault User',
        avatarUrl: profile.avatar_url || null,
        bannerUrl: profile.banner_url || null,
        bio: profile.bio || '',
        website: profile.website || '',
        createdAt: profile.created_at || null,
        subscriberCount: subscriberCounts[profile.id] || 0,
        totalViews: creatorViews[profile.id] || 0,
        viewCount: creatorViews[profile.id] || 0,
      }))

      return { data: channels, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async getChannel(userId, viewerId = null) {
    try {
      if (!userId) {
        throw new Error('A channel user ID is required.')
      }

      const client = getClient()

      const [profileResult, shortsResult, subscribersResult] =
        await Promise.all([
          profileService.getProfile(userId),

          client
            .from(SHORTS_TABLE)
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .order('created_at', { ascending: false }),

          client
            .from(SUBSCRIPTIONS_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', userId),
        ])

      if (profileResult.error) throw profileResult.error
      if (shortsResult.error) throw shortsResult.error
      if (subscribersResult.error) throw subscribersResult.error

      if (!profileResult.data) {
        throw new Error('This channel could not be found.')
      }

      let isSubscribed = false

      if (viewerId && viewerId !== userId) {
        const subscriptionResult = await client
          .from(SUBSCRIPTIONS_TABLE)
          .select('*')
          .eq('creator_id', userId)
          .eq('subscriber_id', viewerId)
          .maybeSingle()

        if (subscriptionResult.error) {
          throw subscriptionResult.error
        }

        isSubscribed = Boolean(subscriptionResult.data)
      }

      const shorts = (shortsResult.data || []).map(normalizeShort)
      const shortIds = shorts.map((short) => short.id).filter(Boolean)

      let totalViews = 0
      let totalLikes = 0
      let totalComments = 0

      if (shortIds.length > 0) {
        const [views, likes, comments] = await Promise.all([
          getRowsByShortIds(client, VIEWS_TABLE, shortIds, userId),
          getRowsByShortIds(client, LIKES_TABLE, shortIds),
          getRowsByShortIds(client, COMMENTS_TABLE, shortIds),
        ])

        const viewCounts = countByShortId(views)
        const likeCounts = countByShortId(likes)
        const commentCounts = countByShortId(comments)

        shorts.forEach((short) => {
          short.viewCount = viewCounts[short.id] || 0
          short.likeCount = likeCounts[short.id] || 0
          short.commentsCount = commentCounts[short.id] || 0
        })

        totalViews = views.length
        totalLikes = likes.length
        totalComments = comments.length
      }

      return {
        data: {
          profile: profileResult.data,
          shorts,
          subscriberCount: subscribersResult.count || 0,
          videoCount: 0,
          shortsCount: shorts.length,
          totalViews,
          totalLikes,
          totalComments,
          isOwner: viewerId === userId,
          isSubscribed,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  async getChannelShorts(userId) {
    try {
      if (!userId) {
        throw new Error('A channel user ID is required.')
      }

      const result = await this.getChannel(userId)

      if (result.error) throw result.error

      return {
        data: result.data.shorts,
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  async getSubscriberCount(userId) {
    try {
      if (!userId) {
        throw new Error('A channel user ID is required.')
      }

      const client = getClient()

      const { count, error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)

      if (error) throw error

      return { data: count || 0, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async checkSubscription(creatorId, subscriberId) {
    try {
      if (!creatorId || !subscriberId) {
        throw new Error('Both user IDs are required.')
      }

      if (creatorId === subscriberId) {
        return { data: false, error: null }
      }

      const client = getClient()

      const { data, error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .select('*')
        .eq('creator_id', creatorId)
        .eq('subscriber_id', subscriberId)
        .maybeSingle()

      if (error) throw error

      return { data: Boolean(data), error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async subscribe(creatorId, subscriberId) {
    try {
      if (!creatorId || !subscriberId) {
        throw new Error('Both user IDs are required.')
      }

      if (creatorId === subscriberId) {
        throw new Error('You cannot subscribe to your own channel.')
      }

      const client = getClient()
      const existing = await this.checkSubscription(
        creatorId,
        subscriberId,
      )

      if (existing.error) throw existing.error

      if (existing.data) {
        return {
          success: true,
          alreadySubscribed: true,
          error: null,
        }
      }

      const { error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .insert({
          creator_id: creatorId,
          subscriber_id: subscriberId,
        })

      if (error) throw error

      return {
        success: true,
        alreadySubscribed: false,
        error: null,
      }
    } catch (error) {
      return { success: false, error }
    }
  },

  async unsubscribe(creatorId, subscriberId) {
    try {
      if (!creatorId || !subscriberId) {
        throw new Error('Both user IDs are required.')
      }

      if (creatorId === subscriberId) {
        throw new Error('You cannot unsubscribe from your own channel.')
      }

      const client = getClient()

      const { error } = await client
        .from(SUBSCRIPTIONS_TABLE)
        .delete()
        .eq('creator_id', creatorId)
        .eq('subscriber_id', subscriberId)

      if (error) throw error

      return { success: true, error: null }
    } catch (error) {
      return { success: false, error }
    }
  },
}

export { normalizeShort }
export default channelService
