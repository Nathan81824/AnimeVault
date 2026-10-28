import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MessageCircle,
  Send,
  LoaderCircle,
  UserRound,
  X,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../features/auth/authStore'

const MAX_COMMENT_LENGTH = 1000

export default function CommentSection({ shortId, onClose }) {
  const { user } = useAuthStore()
  const userId = user?.id

  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const requestIdRef = useRef(0)
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)

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
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: queryError } = await supabase
        .from('short_comments')
        .select(`
          id,
          short_id,
          user_id,
          content,
          created_at,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('short_id', shortId)
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      // Ignore stale requests if the user has switched to another Short.
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
        setError('Could not load comments. Please try again.')
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
    setText('')
    setError('')
    setSuccessMessage('')
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

    if (!shortId) {
      setError('This Short could not be identified.')
      return
    }

    if (!userId) {
      setError('Please sign in to post a comment.')
      return
    }

    // Prevent rapid duplicate submissions.
    if (submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const { error: insertError } = await supabase
        .from('short_comments')
        .insert({
          short_id: shortId,
          user_id: userId,
          content,
        })

      if (insertError) {
        throw insertError
      }

      if (!mountedRef.current) return

      setText('')
      setSuccessMessage('Comment posted.')

      await loadComments()
    } catch (err) {
      console.error('Could not submit comment:', err)

      if (mountedRef.current) {
        setError(
          'Could not post your comment. Please try again.'
        )
      }
    } finally {
      submittingRef.current = false

      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  const formatDate = (date) => {
    if (!date) return ''

    const timestamp = new Date(date)

    if (Number.isNaN(timestamp.getTime())) {
      return ''
    }

    return timestamp.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  if (!shortId) return null

  return (
    <section
      aria-label="Short comments"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-vault-surface text-vault-text"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <MessageCircle
            size={20}
            className="text-vault-accent"
          />

          <h2 className="font-semibold">Comments</h2>

          <span
            className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-vault-muted"
            aria-label={`${comments.length} comments`}
          >
            {comments.length}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="rounded-lg p-2 text-vault-muted transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {/* Comments list */}
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <LoaderCircle
              size={25}
              className="animate-spin text-vault-accent"
              aria-label="Loading comments"
            />
          </div>
        ) : error && comments.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadComments}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15"
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

            <p className="font-medium">
              No comments yet
            </p>

            <p className="mt-1 text-sm text-vault-muted">
              Start the conversation about this Short.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const profile = Array.isArray(comment.profiles)
              ? comment.profiles[0] || {}
              : comment.profiles || {}

            const username =
              profile.username?.trim() || 'Anime fan'

            const avatarUrl = profile.avatar_url

            return (
              <article
                key={comment.id}
                className="flex items-start gap-3"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-vault-purple/20 text-vault-accent">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${username}'s avatar`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <UserRound size={18} />
                  )}
                </div>

                {/* Comment content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold">
                      {username}
                    </span>

                    <time
                      dateTime={comment.created_at || undefined}
                      className="text-xs text-vault-muted"
                    >
                      {formatDate(comment.created_at)}
                    </time>
                  </div>

                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-vault-text/90">
                    {comment.content}
                  </p>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* Comment composer */}
      <form
        onSubmit={submitComment}
        className="shrink-0 border-t border-white/10 p-3"
      >
        {error && comments.length > 0 && (
          <p
            role="alert"
            className="mb-2 text-xs text-red-400"
          >
            {error}
          </p>
        )}

        {successMessage && (
          <p
            role="status"
            className="mb-2 text-xs text-green-400"
          >
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
              // Enter submits; Shift+Enter creates a new line.
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()

                if (
                  text.trim() &&
                  userId &&
                  !submitting
                ) {
                  event.currentTarget.form?.requestSubmit()
                }
              }
            }}
            placeholder={
              userId
                ? 'Write a comment...'
                : 'Sign in to comment'
            }
            aria-label="Write a comment"
            rows={1}
            maxLength={MAX_COMMENT_LENGTH}
            disabled={!userId || submitting}
            className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-vault-text outline-none placeholder:text-vault-muted focus:border-vault-purple disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              !userId ||
              !text.trim() ||
              submitting
            }
            aria-label="Post comment"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vault-purple text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
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