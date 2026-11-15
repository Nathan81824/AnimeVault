
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MessageCircle,
  Send,
  LoaderCircle,
  X,
} from 'lucide-react'

import { useAuthStore } from '../../features/auth/authStore'
import socialService from '../../services/social'
import CommentItem from './CommentItem'

const MAX_COMMENT_LENGTH = 1000

export default function CommentSection({ shortId, onClose }) {
  const { user } = useAuthStore()
  const userId = user?.id

  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [likingIds, setLikingIds] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const mountedRef = useRef(false)
  const requestIdRef = useRef(0)
  const submittingRef = useRef(false)
  const likingIdsRef = useRef(new Set())

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

  const loadComments = useCallback(async () => {
    const requestId = ++requestIdRef.current

    if (!shortId) {
      setComments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await socialService.getComments(shortId)

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return
      }

      setComments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Could not load comments:', err)

      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setError(err.message || 'Could not load comments.')
        setComments([])
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false)
      }
    }
  }, [shortId])

  useEffect(() => {
    setComments([])
    setText('')
    setError('')
    setSuccessMessage('')
    setLikingIds([])
    likingIdsRef.current.clear()
    loadComments()
  }, [loadComments])

  const submitComment = async (event) => {
    event.preventDefault()

    const content = text.trim()

    if (!content) {
      setError('Please write a comment first.')
      return
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      setError(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`)
      return
    }

    if (!userId) {
      setError('Please sign in to post a comment.')
      return
    }

    if (submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const newComment = await socialService.addComment(
        shortId,
        content,
      )

      if (!mountedRef.current) return

      setComments((previous) => [newComment, ...previous])
      setText('')
      setSuccessMessage('Comment posted.')
    } catch (err) {
      console.error('Could not submit comment:', err)

      if (mountedRef.current) {
        setError(
          err.message || 'Could not post your comment. Please try again.',
        )
      }
    } finally {
      submittingRef.current = false

      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  const handleLike = async (commentId) => {
    if (!commentId || !userId || likingIdsRef.current.has(commentId)) {
      return
    }

    likingIdsRef.current.add(commentId)

    setLikingIds((previous) => [...previous, commentId])
    setError('')
    setSuccessMessage('')

    try {
      const result = await socialService.toggleCommentLike(commentId)

      if (!mountedRef.current) return

      setComments((previous) =>
        previous.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                liked_by_user: result.liked,
                like_count: result.likeCount,
              }
            : comment
        )
      )
    } catch (err) {
      console.error('Could not like comment:', err)

      if (mountedRef.current) {
        setError(err.message || 'Could not update comment like.')
      }
    } finally {
      likingIdsRef.current.delete(commentId)

      if (mountedRef.current) {
        setLikingIds((previous) =>
          previous.filter((id) => id !== commentId)
        )
      }
    }
  }

  const handleDelete = async (commentId) => {
    if (!commentId || deletingId) return

    setDeletingId(commentId)
    setError('')
    setSuccessMessage('')

    try {
      await socialService.deleteComment(commentId)

      if (!mountedRef.current) return

      setComments((previous) =>
        previous.filter((comment) => comment.id !== commentId)
      )

      setSuccessMessage('Comment deleted.')
    } catch (err) {
      console.error('Could not delete comment:', err)

      if (mountedRef.current) {
        setError(err.message || 'Could not delete comment.')
      }
    } finally {
      if (mountedRef.current) {
        setDeletingId(null)
      }
    }
  }

  if (!shortId) return null

  return (
    <section
      aria-label="Short comments"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-orange-500/20 bg-[#15110e] text-white shadow-xl shadow-black/20"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent p-4">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-orange-400" />

          <h2 className="font-bold">Comments</h2>

          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-300">
            {comments.length}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="rounded-full p-2 text-white/50 transition hover:bg-orange-500/15 hover:text-orange-400"
          >
            <X size={19} />
          </button>
        )}
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-4"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <LoaderCircle
              size={25}
              className="animate-spin text-orange-500"
            />
          </div>
        ) : error && comments.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-red-400">{error}</p>

            <button
              type="button"
              onClick={loadComments}
              className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
              <MessageCircle size={28} className="text-orange-400" />
            </div>

            <p className="font-semibold">No comments yet</p>

            <p className="mt-1 text-sm text-white/45">
              Start the conversation about this Short.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-orange-500/10">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={userId}
                onDelete={handleDelete}
                onLike={handleLike}
                isDeleting={deletingId === comment.id}
                isLiking={likingIds.includes(comment.id)}
              />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={submitComment}
        className="shrink-0 border-t border-orange-500/20 bg-black/20 p-3"
      >
        {error && comments.length > 0 && (
          <p role="alert" className="mb-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {successMessage && (
          <p role="status" className="mb-2 text-xs text-orange-400">
            {successMessage}
          </p>
        )}

        {!userId && (
          <p className="mb-2 text-xs text-white/45">
            Sign in to join the conversation.
          </p>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setError('')
              setSuccessMessage('')
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={
              userId ? 'Write a comment...' : 'Sign in to comment'
            }
            aria-label="Write a comment"
            rows={1}
            maxLength={MAX_COMMENT_LENGTH}
            disabled={!userId || submitting}
            className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-orange-500/20 bg-[#0d0b09] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!userId || !text.trim() || submitting}
            aria-label="Post comment"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="mt-2 text-right text-[10px] text-white/35">
          {text.length}/{MAX_COMMENT_LENGTH}
        </p>
      </form>
    </section>
  )
}
