
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
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-vault-surface text-vault-text"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-vault-accent" />

          <h2 className="font-semibold">Comments</h2>

          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-vault-muted">
            {comments.length}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="rounded-full p-2 text-vault-muted transition hover:bg-white/10 hover:text-vault-text"
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
              className="animate-spin text-vault-accent"
            />
          </div>
        ) : error && comments.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-red-400">{error}</p>

            <button
              type="button"
              onClick={loadComments}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageCircle
              size={34}
              className="mb-3 text-vault-muted"
            />

            <p className="font-medium">No comments yet</p>

            <p className="mt-1 text-sm text-vault-muted">
              Start the conversation about this Short.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
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
        className="shrink-0 border-t border-white/10 p-3"
      >
        {error && comments.length > 0 && (
          <p role="alert" className="mb-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {successMessage && (
          <p role="status" className="mb-2 text-xs text-green-400">
            {successMessage}
          </p>
        )}

        {!userId && (
          <p className="mb-2 text-xs text-vault-muted">
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
            className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-vault-text outline-none placeholder:text-vault-muted focus:border-vault-purple disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!userId || !text.trim() || submitting}
            aria-label="Post comment"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vault-purple text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="mt-2 text-right text-[10px] text-vault-muted">
          {text.length}/{MAX_COMMENT_LENGTH}
        </p>
      </form>
    </section>
  )
}
