
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MoreHorizontal,
  Trash2,
  UserRound,
  LoaderCircle,
} from 'lucide-react'

function formatDate(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) return ''

  const difference = Date.now() - date.getTime()
  const minutes = Math.floor(difference / 60000)

  const formatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
  })

  if (minutes < 1) return 'Just now'

  if (minutes < 60) {
    return formatter.format(-minutes, 'minute')
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return formatter.format(-hours, 'hour')
  }

  const days = Math.floor(hours / 24)

  if (days < 30) {
    return formatter.format(-days, 'day')
  }

  const months = Math.floor(days / 30)

  if (months < 12) {
    return formatter.format(-months, 'month')
  }

  return formatter.format(-Math.floor(months / 12), 'year')
}

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  isDeleting = false,
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return undefined

    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showMenu])

  if (!comment) return null

  const authorId = comment.user_id
  const content = comment.content ?? ''

  const rawProfile = comment.profiles ?? comment.profile ?? {}

  const profile = Array.isArray(rawProfile)
    ? rawProfile[0] ?? {}
    : rawProfile

  const username =
    profile.username?.trim() ||
    profile.display_name?.trim() ||
    comment.username?.trim() ||
    comment.display_name?.trim() ||
    'Anime fan'

  const avatarUrl =
    profile.avatar_url ||
    profile.avatar ||
    comment.avatar_url ||
    null

  const isOwner = Boolean(
    currentUserId &&
    authorId &&
    currentUserId === authorId
  )

  const createdAt = comment.created_at
    ? new Date(comment.created_at)
    : null

  const validDate =
    createdAt && !Number.isNaN(createdAt.getTime())

  async function handleDelete() {
    if (!onDelete || !isOwner || isDeleting) return

    setShowMenu(false)

    try {
      await onDelete(comment.id)
    } catch (error) {
      console.error('Could not delete comment:', error)
    }
  }

  const avatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-400">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${username}'s profile`}
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
  )

  return (
    <article className="flex gap-3 border-b border-white/[0.04] py-3 last:border-0">
      {authorId ? (
        <Link
          to={`/profile/${authorId}`}
          aria-label={`View ${username}'s profile`}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {authorId ? (
            <Link
              to={`/profile/${authorId}`}
              className="truncate text-sm font-semibold text-white transition hover:text-orange-400"
            >
              {username}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-white">
              {username}
            </span>
          )}

          {validDate && (
            <time
              dateTime={createdAt.toISOString()}
              title={createdAt.toLocaleString()}
              className="shrink-0 text-xs text-gray-500"
            >
              {formatDate(comment.created_at)}
            </time>
          )}
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
          {content}
        </p>
      </div>

      {isOwner && onDelete && (
        <div
          ref={menuRef}
          className="relative shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              if (!isDeleting) {
                setShowMenu((previous) => !previous)
              }
            }}
            aria-label="Comment options"
            aria-expanded={showMenu}
            aria-haspopup="menu"
            disabled={isDeleting}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-orange-500/10 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <MoreHorizontal size={18} />
            )}
          </button>

          {showMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-xl border border-white/10 bg-[#15151f] p-1 shadow-xl shadow-black/30"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={15} />
                )}

                {isDeleting ? 'Deleting...' : 'Delete comment'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
