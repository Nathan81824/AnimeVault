
import { supabase } from '../lib/supabase'

const SHORTS_TABLE = 'shorts'
const LIKES_TABLE = 'short_likes'
const COMMENTS_TABLE = 'short_comments'
const COMMENT_LIKES_TABLE = 'comment_likes'
const VIEWS_TABLE = 'short_views'
const PROFILES_TABLE = 'profiles'

const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data?.user ?? null
}

const getLikeCount = async (shortId) => {
  const { count, error } = await supabase
    .from(LIKES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('short_id', shortId)

  if (error) throw error

  return count ?? 0
}

const getCommentCount = async (shortId) => {
  const { count, error } = await supabase
    .from(COMMENTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('short_id', shortId)

  if (error) throw error

  return count ?? 0
}

const getViewCount = async (shortId) => {
  const { count, error } = await supabase
    .from(VIEWS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('short_id', shortId)

  if (error) throw error

  return count ?? 0
}

const getShortStats = async (shortId) => {
  const [likes, comments, views] = await Promise.all([
    getLikeCount(shortId),
    getCommentCount(shortId),
    getViewCount(shortId),
  ])

  return { likes, comments, views }
}

const hasLiked = async (shortId, userId) => {
  if (!userId) return false

  const { data, error } = await supabase
    .from(LIKES_TABLE)
    .select('short_id')
    .eq('short_id', shortId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  return Boolean(data)
}

const likeShort = async (shortId) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to like a Short.')

  const { error } = await supabase
    .from(LIKES_TABLE)
    .upsert(
      {
        short_id: shortId,
        user_id: user.id,
      },
      {
        onConflict: 'short_id,user_id',
        ignoreDuplicates: true,
      }
    )

  if (error) throw error

  return getLikeCount(shortId)
}

const unlikeShort = async (shortId) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to unlike a Short.')

  const { error } = await supabase
    .from(LIKES_TABLE)
    .delete()
    .eq('short_id', shortId)
    .eq('user_id', user.id)

  if (error) throw error

  return getLikeCount(shortId)
}

const toggleLike = async (shortId) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to like a Short.')

  const liked = await hasLiked(shortId, user.id)

  if (liked) {
    await unlikeShort(shortId)
  } else {
    await likeShort(shortId)
  }

  return {
    liked: !liked,
    likes: await getLikeCount(shortId),
  }
}

const getCommentLikeCount = async (commentId) => {
  const { count, error } = await supabase
    .from(COMMENT_LIKES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId)

  if (error) throw error

  return count ?? 0
}

const getComments = async (shortId) => {
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .select('*')
    .eq('short_id', shortId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  const comments = data ?? []

  if (comments.length === 0) return []

  const user = await getCurrentUser()

  const commentIds = comments.map((comment) => comment.id)

  const userIds = [
    ...new Set(
      comments
        .map((comment) => comment.user_id)
        .filter(Boolean)
    ),
  ]

  const [likesResult, profilesResult] = await Promise.all([
    supabase
      .from(COMMENT_LIKES_TABLE)
      .select('comment_id, user_id')
      .in('comment_id', commentIds),

    supabase
      .from(PROFILES_TABLE)
      .select('id, username, display_name, avatar_url')
      .in('id', userIds),
  ])

  if (likesResult.error) throw likesResult.error
  if (profilesResult.error) throw profilesResult.error

  const likeCounts = {}
  const likedComments = new Set()
  const profileMap = new Map()

  for (const profile of profilesResult.data ?? []) {
    profileMap.set(profile.id, profile)
  }

  for (const like of likesResult.data ?? []) {
    likeCounts[like.comment_id] =
      (likeCounts[like.comment_id] ?? 0) + 1

    if (user && like.user_id === user.id) {
      likedComments.add(like.comment_id)
    }
  }

  return comments.map((comment) => ({
    ...comment,
    profiles: profileMap.get(comment.user_id) ?? null,
    like_count: likeCounts[comment.id] ?? 0,
    liked_by_user: likedComments.has(comment.id),
  }))
}

const addComment = async (shortId, content) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to comment.')

  const cleanContent = String(content ?? '').trim()

  if (!cleanContent) {
    throw new Error('Comment cannot be empty.')
  }

  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert({
      short_id: shortId,
      user_id: user.id,
      content: cleanContent,
    })
    .select()
    .single()

  if (error) throw error

  const { data: profile, error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .select('id, username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError

  return {
    ...data,
    profiles: profile ?? null,
    like_count: 0,
    liked_by_user: false,
  }
}

const toggleCommentLike = async (commentId) => {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('You must sign in to like a comment.')
  }

  const { data: existingLike, error: checkError } = await supabase
    .from(COMMENT_LIKES_TABLE)
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (checkError) throw checkError

  let liked

  if (existingLike) {
    const { error } = await supabase
      .from(COMMENT_LIKES_TABLE)
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id)

    if (error) throw error

    liked = false
  } else {
    const { error } = await supabase
      .from(COMMENT_LIKES_TABLE)
      .insert({
        comment_id: commentId,
        user_id: user.id,
      })

    if (error) throw error

    liked = true
  }

  const likeCount = await getCommentLikeCount(commentId)

  return {
    liked,
    likeCount,
  }
}

const deleteComment = async (commentId) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to delete a comment.')

  const { error } = await supabase
    .from(COMMENTS_TABLE)
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) throw error

  return true
}

const updateComment = async (commentId, content) => {
  const user = await getCurrentUser()

  if (!user) throw new Error('You must sign in to edit a comment.')

  const cleanContent = String(content ?? '').trim()

  if (!cleanContent) {
    throw new Error('Comment cannot be empty.')
  }

  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .update({ content: cleanContent })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return data
}

const recordView = async (shortId) => {
  const user = await getCurrentUser()

  if (!user) return false

  const { error } = await supabase
    .from(VIEWS_TABLE)
    .upsert(
      {
        short_id: shortId,
        user_id: user.id,
        viewer_id: user.id,
      },
      {
        onConflict: 'short_id,user_id',
        ignoreDuplicates: true,
      }
    )

  if (error) throw error

  return true
}

const getMyTotalStats = async (userId) => {
  if (!userId) {
    return {
      shorts: 0,
      likes: 0,
      comments: 0,
      views: 0,
    }
  }

  const { count: shorts, error: shortsError } = await supabase
    .from(SHORTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (shortsError) throw shortsError

  const { data: userShorts, error: userShortsError } = await supabase
    .from(SHORTS_TABLE)
    .select('id')
    .eq('user_id', userId)

  if (userShortsError) throw userShortsError

  const shortIds = (userShorts ?? []).map((short) => short.id)

  if (shortIds.length === 0) {
    return {
      shorts: shorts ?? 0,
      likes: 0,
      comments: 0,
      views: 0,
    }
  }

  const [likesResult, commentsResult, viewsResult] = await Promise.all([
    supabase
      .from(LIKES_TABLE)
      .select('*', { count: 'exact', head: true })
      .in('short_id', shortIds),

    supabase
      .from(COMMENTS_TABLE)
      .select('*', { count: 'exact', head: true })
      .in('short_id', shortIds),

    supabase
      .from(VIEWS_TABLE)
      .select('*', { count: 'exact', head: true })
      .in('short_id', shortIds),
  ])

  if (likesResult.error) throw likesResult.error
  if (commentsResult.error) throw commentsResult.error
  if (viewsResult.error) throw viewsResult.error

  return {
    shorts: shorts ?? 0,
    likes: likesResult.count ?? 0,
    comments: commentsResult.count ?? 0,
    views: viewsResult.count ?? 0,
  }
}

const socialService = {
  getLikeCount,
  getCommentCount,
  getViewCount,
  getShortStats,
  hasLiked,
  likeShort,
  unlikeShort,
  toggleLike,
  getComments,
  addComment,
  getCommentLikeCount,
  toggleCommentLike,
  deleteComment,
  updateComment,
  recordView,
  getMyTotalStats,
}

export default socialService
