import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard, LoaderCircle, RefreshCw } from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'
import { useShortStore } from '../features/shorts/shortsStore'
import ShortCard from '../components/shorts/ShortCard'
import CommentSection from '../components/comments/CommentSection'

const PAGE_SIZE = 20

const SEEN_SHORTS_KEY = 'anime-vault-seen-shorts-v1'

function readSeenShortIds() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SEEN_SHORTS_KEY) || '[]',
    )
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function shuffle(items) {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

function shuffleForThisVisit(items) {
  const seen = readSeenShortIds()

  const unseenItems = items.filter(
    (item) => !seen.has(String(item?.id)),
  )

  const seenItems = items.filter(
    (item) => seen.has(String(item?.id)),
  )

  // Show Shorts not watched in previous visits first.
  // If everything has been seen, start a new shuffled cycle.
  if (unseenItems.length === 0 && items.length > 0) {
    try {
      window.localStorage.removeItem(SEEN_SHORTS_KEY)
    } catch {
      // Storage may be blocked.
    }

    return shuffle(items)
  }

  return [...shuffle(unseenItems), ...shuffle(seenItems)]
}

function rememberSeenShort(shortId) {
  if (!shortId) return

  try {
    const seen = readSeenShortIds()
    seen.add(String(shortId))

    // Keep the saved history bounded.
    window.localStorage.setItem(
      SEEN_SHORTS_KEY,
      JSON.stringify([...seen].slice(-1000)),
    )
  } catch {
    // Storage may be blocked.
  }
}

export default function Shorts() {
  const user = useAuthStore((state) => state.user)

  const shorts = useShortStore((state) => state.shorts)
  const isLoading = useShortStore((state) => state.isLoading)
  const error = useShortStore((state) => state.error)
  const likedShortIds = useShortStore((state) => state.likedShortIds)

  const fetchShorts = useShortStore((state) => state.fetchShorts)
  const recordView = useShortStore((state) => state.recordView)
  const checkLiked = useShortStore((state) => state.checkLiked)
  const likeShort = useShortStore((state) => state.likeShort)
  const unlikeShort = useShortStore((state) => state.unlikeShort)
  const fetchComments = useShortStore((state) => state.fetchComments)

  const [activeIndex, setActiveIndex] = useState(0)
  const [commentsShortId, setCommentsShortId] = useState(null)
  const [muted, setMuted] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busyLikeIds, setBusyLikeIds] = useState([])
  const [copiedShortId, setCopiedShortId] = useState(null)

  const feedRef = useRef(null)
  const cardRefs = useRef(new Map())
  const viewRecordedRef = useRef(new Set())
  const observerRef = useRef(null)
  const touchStartYRef = useRef(null)
  const activeIndexRef = useRef(0)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  // --------------------------------------------------
  // LOAD SHORTS
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function loadInitialShorts() {
      const result = await fetchShorts({
        limit: PAGE_SIZE,
        offset: 0,
        append: false,
      })

      if (cancelled) return

      setHasMore((result?.shorts?.length || 0) >= PAGE_SIZE)

      if (
        result?.success &&
        Array.isArray(result.shorts) &&
        result.shorts.length
      ) {
        const shuffled = shuffleForThisVisit(result.shorts)

        // Keep the Zustand feed order aligned with the displayed order.
        useShortStore.setState({ shorts: shuffled })
      }

      setActiveIndex(0)
    }

    loadInitialShorts()

    return () => {
      cancelled = true
    }
  }, [fetchShorts])

  // --------------------------------------------------
  // CHECK LIKE STATUS
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.id || !shorts.length) return

    shorts.forEach((short) => {
      if (short?.id) {
        checkLiked(short.id)
      }
    })
  }, [user?.id, shorts, checkLiked])

  // --------------------------------------------------
  // INTERSECTION OBSERVER
  // Determines which Short is currently active.
  // --------------------------------------------------

  useEffect(() => {
    const root = feedRef.current

    if (!root || !shorts.length) return

    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let bestEntry = null

        for (const entry of entries) {
          if (!entry.isIntersecting) continue

          if (
            !bestEntry ||
            entry.intersectionRatio > bestEntry.intersectionRatio
          ) {
            bestEntry = entry
          }
        }

        if (!bestEntry) return

        const index = Number(bestEntry.target.dataset.shortIndex)

        if (
          Number.isInteger(index) &&
          index !== activeIndexRef.current
        ) {
          setActiveIndex(index)
        }
      },
      {
        root,
        threshold: [0.35, 0.55, 0.7, 0.85],
      },
    )

    cardRefs.current.forEach((element) => {
      if (element) observerRef.current.observe(element)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [shorts.length])

  // --------------------------------------------------
  // RECORD A VIEW ONCE PER SHORT PER PAGE SESSION
  // --------------------------------------------------

  useEffect(() => {
    const short = shorts[activeIndex]

    if (!short?.id || viewRecordedRef.current.has(short.id)) {
      return
    }

    viewRecordedRef.current.add(short.id)
    rememberSeenShort(short.id)
    recordView(short.id)
  }, [activeIndex, shorts, recordView])

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const goToShort = useCallback(
    (index) => {
      if (!shorts.length) return

      const safeIndex = Math.max(
        0,
        Math.min(index, shorts.length - 1),
      )

      setActiveIndex(safeIndex)

      const element = cardRefs.current.get(safeIndex)

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    },
    [shorts.length],
  )

  const goNext = useCallback(() => {
    if (activeIndex < shorts.length - 1) {
      goToShort(activeIndex + 1)
      return
    }

    if (hasMore && !loadingMore) {
      loadMoreShorts()
    }
  }, [
    activeIndex,
    shorts.length,
    goToShort,
    hasMore,
    loadingMore,
  ])

  const goPrevious = useCallback(() => {
    if (activeIndex > 0) {
      goToShort(activeIndex - 1)
    }
  }, [activeIndex, goToShort])

  // --------------------------------------------------
  // LOAD MORE SHORTS
  // --------------------------------------------------

  const loadMoreShorts = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    setActionError('')

    try {
      const result = await fetchShorts({
        limit: PAGE_SIZE,
        offset: shorts.length,
        append: true,
      })

      const received = result?.shorts?.length || 0

      setHasMore(received >= PAGE_SIZE)

      if (!result?.success && result?.error) {
        setActionError(result.error)
      }
    } catch (err) {
      setActionError(
        err?.message || 'Unable to load more Shorts.',
      )
    } finally {
      setLoadingMore(false)
    }
  }, [
    loadingMore,
    hasMore,
    fetchShorts,
    shorts.length,
  ])

  // --------------------------------------------------
  // LIKE / UNLIKE
  // --------------------------------------------------

  const handleLike = useCallback(
    async (shortId) => {
      if (!shortId) return

      if (!user?.id) {
        setActionError('Please sign in to like a Short.')
        return
      }

      if (busyLikeIds.includes(shortId)) return

      setBusyLikeIds((previous) => [...previous, shortId])
      setActionError('')

      try {
        const alreadyLiked = likedShortIds.includes(shortId)

        const result = alreadyLiked
          ? await unlikeShort(shortId)
          : await likeShort(shortId)

        if (!result?.success) {
          setActionError(
            result?.error || 'Unable to update your like.',
          )
        }
      } catch (err) {
        setActionError(
          err?.message || 'Unable to update your like.',
        )
      } finally {
        setBusyLikeIds((previous) =>
          previous.filter((id) => id !== shortId),
        )
      }
    },
    [
      user?.id,
      busyLikeIds,
      likedShortIds,
      likeShort,
      unlikeShort,
    ],
  )

  // --------------------------------------------------
  // COMMENTS
  // --------------------------------------------------

  const openComments = useCallback(
    async (shortId) => {
      if (!shortId) return

      setCommentsShortId(shortId)
      setActionError('')

      try {
        await fetchComments(shortId)
      } catch (err) {
        setActionError(
          err?.message || 'Unable to load comments.',
        )
      }
    },
    [fetchComments],
  )

  const closeComments = useCallback(() => {
    setCommentsShortId(null)
  }, [])

  // --------------------------------------------------
  // SHARE
  // --------------------------------------------------

  const handleShare = useCallback(async (short) => {
    if (!short?.id) return

    const shareUrl = `${window.location.origin}/shorts/${short.id}`
    const shareTitle = short.title || 'Anime Vault Short'

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCopiedShortId(short.id)

        window.setTimeout(() => {
          setCopiedShortId((current) =>
            current === short.id ? null : current,
          )
        }, 1800)
      } else {
        window.prompt('Copy this Short link:', shareUrl)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setActionError('Unable to share this Short.')
      }
    }
  }, [])

  // --------------------------------------------------
  // KEYBOARD NAVIGATION
  // --------------------------------------------------

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        goNext()
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        goPrevious()
      }

      if (event.key === 'Escape') {
        closeComments()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [goNext, goPrevious, closeComments])

  // --------------------------------------------------
  // TOUCH NAVIGATION
  // --------------------------------------------------

  function handleTouchStart(event) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null
  }

  function handleTouchEnd(event) {
    const startY = touchStartYRef.current
    const endY = event.changedTouches[0]?.clientY

    touchStartYRef.current = null

    if (startY == null || endY == null) return

    const distance = startY - endY

    if (Math.abs(distance) < 70) return

    if (distance > 0) {
      goNext()
    } else {
      goPrevious()
    }
  }

  // --------------------------------------------------
  // EMPTY / LOADING STATES
  // --------------------------------------------------

  if (isLoading && shorts.length === 0) {
    return (
      <main className="shorts-page">
        <div className="shorts-state">
          <LoaderCircle className="shorts-spinner" size={34} />
          <h2>Loading Anime Shorts</h2>
          <p>Getting your anime moments ready...</p>
        </div>

        <style>{styles}</style>
      </main>
    )
  }

  if (error && shorts.length === 0) {
    return (
      <main className="shorts-page">
        <header className="shorts-header">
          <Link to="/" className="shorts-brand">
            <Clapperboard size={23} />
            <span>Anime Vault</span>
          </Link>
        </header>

        <div className="shorts-state">
          <h2>Could not load Shorts</h2>
          <p>{error}</p>

          <button
            type="button"
            className="shorts-primary-button"
            onClick={() =>
              fetchShorts({
                limit: PAGE_SIZE,
                offset: 0,
                append: false,
              })
            }
          >
            <RefreshCw size={17} />
            Try again
          </button>
        </div>

        <style>{styles}</style>
      </main>
    )
  }

  if (!shorts.length) {
    return (
      <main className="shorts-page">
        <header className="shorts-header">
          <Link to="/" className="shorts-brand">
            <Clapperboard size={23} />
            <span>Anime Vault</span>
          </Link>
        </header>

        <div className="shorts-state">
          <Clapperboard size={42} />
          <h2>No Shorts yet</h2>
          <p>Be the first to share an anime moment.</p>

          <Link
            to="/shorts/create"
            className="shorts-primary-button"
          >
            Create a Short
          </Link>
        </div>

        <style>{styles}</style>
      </main>
    )
  }

  return (
    <main className="shorts-page">
      {/* HEADER */}
      <header className="shorts-header">
        <Link to="/" className="shorts-brand">
          <Clapperboard size={23} />
          <span>Anime Vault</span>
        </Link>

        <div className="shorts-header-actions">
          <span className="shorts-header-label">
            Anime Shorts
          </span>

          <Link
            to="/shorts/create"
            className="shorts-create-button"
          >
            + Create
          </Link>
        </div>
      </header>

      {/* FEED */}
      <section className="shorts-layout">
        <div
          className="shorts-feed"
          ref={feedRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {shorts.map((short, index) => {
            const shortId = short.id
            const isLiked = likedShortIds.includes(shortId)
            const isBusy = busyLikeIds.includes(shortId)
            const isActive = index === activeIndex
            const isCommentOpen = commentsShortId === shortId

            return (
              <article
                key={shortId}
                ref={(element) => {
                  if (element) {
                    cardRefs.current.set(index, element)
                  } else {
                    cardRefs.current.delete(index)
                  }
                }}
                data-short-index={index}
                className={`shorts-feed-item ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <div className="shorts-video-column">
                  <ShortCard
                    short={short}
                    isActive={isActive}
                    isLiked={isLiked}
                    muted={muted}
                    commentsOpen={isCommentOpen}
                    onLike={() => handleLike(shortId)}
                    onUnlike={() => handleLike(shortId)}
                    onComments={() => openComments(shortId)}
                    onNext={goNext}
                    onPrevious={goPrevious}
                    onView={() => {
                      if (
                        shortId &&
                        !viewRecordedRef.current.has(shortId)
                      ) {
                        viewRecordedRef.current.add(shortId)
                        rememberSeenShort(shortId)
                        recordView(shortId)
                      }
                    }}
                    onToggleMute={() =>
                      setMuted((previous) => !previous)
                    }
                  />
                </div>

                {/* COMMENTS */}
                {isCommentOpen && (
                  <div className="shorts-comments-panel">
                    <div className="shorts-comments-header">
                      <h3>Comments</h3>

                      <button
                        type="button"
                        onClick={closeComments}
                        aria-label="Close comments"
                      >
                        ✕
                      </button>
                    </div>

                    <CommentSection
                      shortId={shortId}
                      short={short}
                    />
                  </div>
                )}
              </article>
            )
          })}

          {/* LOAD MORE */}
          {loadingMore && (
            <div className="shorts-load-more">
              <LoaderCircle className="shorts-spinner" size={25} />
              <span>Loading more Shorts...</span>
            </div>
          )}

          {!hasMore && shorts.length > 0 && (
            <div className="shorts-end-message">
              <Clapperboard size={22} />
              <p>You've reached the end of the Shorts feed.</p>
            </div>
          )}
        </div>
      </section>

      {(actionError || (error && shorts.length > 0)) && (
        <div className="shorts-toast" role="status">
          <span>{actionError || error}</span>

          <button
            type="button"
            onClick={() => {
              setActionError('')
            }}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <style>{styles}</style>
    </main>
  )
}

const styles = `
.shorts-page {
  --shorts-accent: #a855f7;
  --shorts-accent-light: #c084fc;
  --shorts-bg: #09090f;
  --shorts-panel: #14141d;
  --shorts-text: #f5f3ff;
  --shorts-muted: #a1a1b5;

  min-height: 100vh;
  background: var(--shorts-bg);
  color: var(--shorts-text);
  font-family: inherit;
}

.shorts-page *,
.shorts-page *::before,
.shorts-page *::after {
  box-sizing: border-box;
}

.shorts-header {
  position: sticky;
  top: 0;
  z-index: 50;
  min-height: 68px;
  padding: 12px clamp(16px, 4vw, 48px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(9, 9, 15, 0.92);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(18px);
}

.shorts-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 18px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.shorts-brand svg {
  color: var(--shorts-accent-light);
}

.shorts-header-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.shorts-header-label {
  color: var(--shorts-muted);
  font-size: 13px;
  font-weight: 700;
}

.shorts-create-button,
.shorts-primary-button {
  min-height: 40px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: var(--shorts-accent);
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.shorts-create-button:hover,
.shorts-primary-button:hover {
  background: #9333ea;
  transform: translateY(-1px);
}

.shorts-layout {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 68px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  padding: 22px 24px 40px;
}

.shorts-feed {
  width: min(100%, 540px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  overflow: visible;
}

.shorts-feed-item {
  width: 100%;
  max-width: 540px;
  scroll-margin-top: 88px;
}

.shorts-video-column {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
}

.shorts-comments-panel {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 16px;
  background: var(--shorts-panel);
}

.shorts-comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.shorts-comments-header h3 {
  margin: 0;
  font-size: 16px;
}

.shorts-comments-header button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: #292936;
  color: white;
  cursor: pointer;
}

.shorts-load-more,
.shorts-end-message {
  width: 100%;
  padding: 24px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--shorts-muted);
  font-size: 13px;
  text-align: center;
}

.shorts-end-message {
  flex-direction: column;
  padding-bottom: 48px;
}

.shorts-end-message p {
  margin: 0;
}

.shorts-spinner {
  animation: shorts-spin 1s linear infinite;
}

@keyframes shorts-spin {
  to {
    transform: rotate(360deg);
  }
}

.shorts-state {
  min-height: 65vh;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.shorts-state h2 {
  margin: 0;
  font-size: 23px;
}

.shorts-state p {
  max-width: 440px;
  margin: 0 0 10px;
  color: var(--shorts-muted);
  font-size: 14px;
  line-height: 1.6;
}

.shorts-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  max-width: min(420px, calc(100vw - 40px));
  padding: 13px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  background: #252332;
  color: white;
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  font-size: 13px;
}

.shorts-toast button {
  border: 0;
  background: transparent;
  color: white;
  cursor: pointer;
}

@media (max-width: 760px) {
  .shorts-header {
    min-height: 60px;
    padding: 10px 14px;
  }

  .shorts-brand {
    font-size: 16px;
  }

  .shorts-header-label {
    display: none;
  }

  .shorts-layout {
    min-height: calc(100vh - 60px);
    padding: 18px 10px 30px;
    gap: 0;
  }

  .shorts-feed {
    width: 100%;
    gap: 38px;
  }

  .shorts-feed-item {
    width: 100%;
  }

  .shorts-video-column {
    gap: 5px;
  }

  .shorts-comments-panel {
    padding: 12px;
  }
}

@media (max-width: 390px) {
  .shorts-layout {
    padding-left: 7px;
    padding-right: 7px;
  }

  .shorts-video-column {
    gap: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shorts-page *,
  .shorts-page *::before,
  .shorts-page *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
`