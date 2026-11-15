
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clapperboard,
  LoaderCircle,
  RefreshCw,
  Upload,
  X,
  Sparkles,
} from 'lucide-react'

import { useAuthStore } from '../features/auth/authStore'
import { useShortStore } from '../features/shorts/shortsStore'
import shortService from '../features/shorts/services/shortsService'

import ShortCard from '../components/shorts/ShortCard'
import CommentSection from '../components/comments/CommentSection'

const PAGE_SIZE = 20
const SEEN_SHORTS_KEY = 'anime-vault-seen-shorts-v1'

function readSeenShortIds() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(SEEN_SHORTS_KEY) || '[]',
    )

    return new Set(Array.isArray(saved) ? saved.map(String) : [])
  } catch {
    return new Set()
  }
}

function saveSeenShortIds(ids) {
  try {
    window.localStorage.setItem(
      SEEN_SHORTS_KEY,
      JSON.stringify([...ids].slice(-1000)),
    )
  } catch {
  }
}

function rememberSeenShort(id) {
  if (!id) return

  const seen = readSeenShortIds()
  seen.add(String(id))
  saveSeenShortIds(seen)
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
  if (!items.length) return []

  const seen = readSeenShortIds()

  const unseen = items.filter(
    (item) => !seen.has(String(item.id)),
  )

  const watched = items.filter(
    (item) => seen.has(String(item.id)),
  )

  if (!unseen.length) {
    try {
      window.localStorage.removeItem(SEEN_SHORTS_KEY)
    } catch {
    }

    return shuffle(items)
  }

  return [...shuffle(unseen), ...shuffle(watched)]
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
  const [muted, setMuted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busyLikeIds, setBusyLikeIds] = useState([])
  const [savedShortIds, setSavedShortIds] = useState([])
  const [busySaveIds, setBusySaveIds] = useState([])

  const cardRefs = useRef(new Map())
  const viewRecordedRef = useRef(new Set())
  const touchStartYRef = useRef(null)
  const activeIndexRef = useRef(0)
  const navigationTargetRef = useRef(null)
  const navigationTimeoutRef = useRef(null)
  const likeRequestsRef = useRef(new Set())
  const saveRequestsRef = useRef(new Set())
  const loadingMoreRef = useRef(false)
  const commentsRequestRef = useRef(0)

  const activeShort = shorts[activeIndex]

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSavedShorts() {
      if (!user?.id) {
        setSavedShortIds([])
        return
      }

      try {
        const result = await shortService.getSavedShorts()

        if (cancelled) return

        if (!result?.success) {
          console.error('Unable to load saved Shorts:', result?.error)
          return
        }

        const savedItems = result.shorts || []

        setSavedShortIds(
          savedItems
            .map((item) => item.short_id || item.id)
            .filter(Boolean)
            .map(String),
        )
      } catch (err) {
        if (!cancelled) {
          console.error('Unable to load saved Shorts:', err)
        }
      }
    }

    loadSavedShorts()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false

    async function loadInitialShorts() {
      try {
        setActionError('')
        activeIndexRef.current = 0
        navigationTargetRef.current = null
        setActiveIndex(0)
        setHasMore(true)
        viewRecordedRef.current.clear()

        const result = await fetchShorts({
          limit: PAGE_SIZE,
          offset: 0,
          append: false,
        })

        if (cancelled) return

        const received = result?.shorts || []

        setHasMore(received.length >= PAGE_SIZE)

        if (result?.success && received.length) {
          useShortStore.setState({
            shorts: shuffleForThisVisit(received),
          })
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(
            err?.message || 'Unable to load Anime Shorts.',
          )
        }
      }
    }

    loadInitialShorts()

    return () => {
      cancelled = true
    }
  }, [fetchShorts])

  useEffect(() => {
    if (!user?.id || !shorts.length) return

    shorts.forEach((short) => {
      if (short?.id) checkLiked(short.id)
    })
  }, [user?.id, shorts, checkLiked])

  const loadMoreShorts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return

    loadingMoreRef.current = true
    setLoadingMore(true)
    setActionError('')

    try {
      const currentShorts = useShortStore.getState().shorts

      const result = await fetchShorts({
        limit: PAGE_SIZE,
        offset: currentShorts.length,
        append: true,
      })

      const received = result?.shorts || []

      setHasMore(received.length >= PAGE_SIZE)

      if (result?.success && received.length) {
        const currentIds = new Set(
          useShortStore.getState().shorts.map((item) => String(item.id)),
        )

        const newShorts = received.filter(
          (item) => !currentIds.has(String(item.id)),
        )

        if (newShorts.length) {
          useShortStore.setState((state) => ({
            shorts: [
              ...state.shorts,
              ...shuffleForThisVisit(newShorts),
            ],
          }))
        }
      }

      if (!result?.success) {
        setActionError(
          result?.error || 'Unable to load more Shorts.',
        )
      }
    } catch (err) {
      setActionError(
        err?.message || 'Unable to load more Shorts.',
      )
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, fetchShorts])

  const goToShort = useCallback((index) => {
    const currentShorts = useShortStore.getState().shorts

    if (!currentShorts.length) return

    const safeIndex = Math.max(
      0,
      Math.min(index, currentShorts.length - 1),
    )

    const target = cardRefs.current.get(safeIndex)

    if (!target) return

    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current)
    }

    activeIndexRef.current = safeIndex
    navigationTargetRef.current = safeIndex
    setActiveIndex(safeIndex)

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    navigationTimeoutRef.current = window.setTimeout(() => {
      if (navigationTargetRef.current === safeIndex) {
        navigationTargetRef.current = null
      }
    }, 1800)
  }, [])

  const goNext = useCallback(() => {
    const currentShorts = useShortStore.getState().shorts
    const nextIndex = activeIndexRef.current + 1

    if (nextIndex < currentShorts.length) {
      goToShort(nextIndex)
      return
    }

    if (hasMore && !loadingMoreRef.current) {
      loadMoreShorts()
    }
  }, [goToShort, hasMore, loadMoreShorts])

  const goPrevious = useCallback(() => {
    const previousIndex = activeIndexRef.current - 1

    if (previousIndex >= 0) {
      goToShort(previousIndex)
    }
  }, [goToShort])

  useEffect(() => {
    if (!shorts.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (navigationTargetRef.current !== null) {
          const targetIndex = navigationTargetRef.current
          const targetEntry = entries.find(
            (entry) =>
              Number(entry.target.dataset.shortIndex) === targetIndex,
          )

          if (targetEntry?.isIntersecting) {
            navigationTargetRef.current = null

            if (navigationTimeoutRef.current) {
              window.clearTimeout(navigationTimeoutRef.current)
              navigationTimeoutRef.current = null
            }
          } else {
            return
          }
        }

        let bestIndex = -1
        let bestRatio = 0

        cardRefs.current.forEach((element, index) => {
          if (!element) return

          const rect = element.getBoundingClientRect()
          const visibleTop = Math.max(rect.top, 0)
          const visibleBottom = Math.min(
            rect.bottom,
            window.innerHeight,
          )

          const visibleHeight = Math.max(
            0,
            visibleBottom - visibleTop,
          )

          const denominator = Math.min(
            rect.height,
            window.innerHeight,
          )

          const ratio = denominator > 0
            ? visibleHeight / denominator
            : 0

          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIndex = index
          }
        })

        if (
          bestIndex >= 0 &&
          bestRatio > 0.15 &&
          bestIndex !== activeIndexRef.current
        ) {
          activeIndexRef.current = bestIndex
          setActiveIndex(bestIndex)
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    )

    cardRefs.current.forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [shorts.length])

  useEffect(() => {
    if (!activeShort?.id) return

    const id = String(activeShort.id)

    if (viewRecordedRef.current.has(id)) return

    viewRecordedRef.current.add(id)
    rememberSeenShort(id)

    Promise.resolve(recordView(activeShort.id)).catch((err) => {
      console.error('Unable to record Short view:', err)
    })
  }, [activeShort?.id, recordView])

  const handleLike = useCallback(async (shortId) => {
    if (!shortId) return

    if (!user?.id) {
      setActionError('Please sign in to like a Short.')
      return
    }

    const id = String(shortId)

    if (likeRequestsRef.current.has(id)) return

    likeRequestsRef.current.add(id)
    setBusyLikeIds((previous) => [...previous, id])
    setActionError('')

    try {
      const alreadyLiked = useShortStore
        .getState()
        .likedShortIds
        .some((item) => String(item) === id)

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
      likeRequestsRef.current.delete(id)

      setBusyLikeIds((previous) =>
        previous.filter((item) => item !== id),
      )
    }
  }, [user?.id, likeShort, unlikeShort])

  const handleSave = useCallback(async (shortId) => {
    if (!shortId) return

    if (!user?.id) {
      setActionError('Please sign in to save Shorts to My Vault.')
      return
    }

    const id = String(shortId)

    if (savedShortIds.includes(id)) {
      setActionError('This Short is already saved in your My Vault.')
      return
    }

    if (saveRequestsRef.current.has(id)) return

    saveRequestsRef.current.add(id)
    setBusySaveIds((previous) => [...previous, id])
    setActionError('')

    try {
      const result = await shortService.saveShort(shortId)

      if (!result?.success) {
        setActionError(
          result?.error || 'Unable to save this Short.',
        )
        return
      }

      setSavedShortIds((previous) =>
        previous.includes(id) ? previous : [...previous, id],
      )

      setActionError(
        result?.message || 'Short saved to My Vault.',
      )
    } catch (err) {
      setActionError(
        err?.message || 'Unable to save this Short.',
      )
    } finally {
      saveRequestsRef.current.delete(id)

      setBusySaveIds((previous) =>
        previous.filter((item) => item !== id),
      )
    }
  }, [user?.id, savedShortIds])

  const openComments = useCallback(async (shortId) => {
    if (!shortId) return

    const requestId = ++commentsRequestRef.current

    setCommentsShortId(shortId)
    setActionError('')

    try {
      await fetchComments(shortId)

      if (requestId !== commentsRequestRef.current) return
    } catch (err) {
      if (requestId === commentsRequestRef.current) {
        setActionError(
          err?.message || 'Unable to load comments.',
        )
      }
    }
  }, [fetchComments])

  const closeComments = useCallback(() => {
    commentsRequestRef.current += 1
    setCommentsShortId(null)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        )
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

  function handleTouchStart(event) {
    touchStartYRef.current =
      event.touches[0]?.clientY ?? null
  }

  function handleTouchEnd(event) {
    const startY = touchStartYRef.current
    const endY = event.changedTouches[0]?.clientY

    touchStartYRef.current = null

    if (startY == null || endY == null) return

    const distance = startY - endY

    if (Math.abs(distance) < 65) return

    if (distance > 0) {
      goNext()
    } else {
      goPrevious()
    }
  }

  const isInitialLoading = isLoading && shorts.length === 0

  return (
    <main className="shorts-page">
      <header className="shorts-header">
        <Link to="/" className="shorts-brand">
          <span className="shorts-brand-icon">
            <Clapperboard size={22} />
          </span>
          <span>Anime Vault</span>
        </Link>

        <Link to="/upload" className="shorts-create-button">
          <Upload size={16} />
          Create
        </Link>
      </header>

      <section className="shorts-feed-section">
        {isInitialLoading ? (
          <div className="shorts-state">
            <LoaderCircle className="shorts-spinner" size={38} />
            <h2>Loading Anime Shorts</h2>
            <p>Finding something good to watch...</p>
          </div>
        ) : (error || actionError) && shorts.length === 0 ? (
          <div className="shorts-state">
            <Clapperboard size={38} />
            <h2>Could not load Shorts</h2>
            <p>{actionError || error}</p>

            <button
              type="button"
              className="shorts-primary-button"
              onClick={() => {
                fetchShorts({
                  limit: PAGE_SIZE,
                  offset: 0,
                  append: false,
                })
              }}
            >
              <RefreshCw size={17} />
              Try again
            </button>
          </div>
        ) : shorts.length === 0 ? (
          <div className="shorts-state">
            <Clapperboard size={42} />
            <h2>No published Shorts yet</h2>
            <p>
              Be the first to share an anime moment with the community.
            </p>

            <Link to="/upload" className="shorts-primary-button">
              <Upload size={17} />
              Create a Short
            </Link>
          </div>
        ) : (
          <div className="shorts-layout">
            <div
              className="shorts-feed"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {shorts.map((short, index) => {
                const shortId = short.id
                const id = String(shortId)

                const isLiked = likedShortIds.some(
                  (item) => String(item) === id,
                )

                const isBusy = busyLikeIds.includes(id)
                const isSaved = savedShortIds.includes(id)
                const isSaving = busySaveIds.includes(id)
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
                    } ${
                      isCommentOpen ? 'has-comments' : ''
                    }`}
                  >
                    <div className="shorts-video-column">
                      <div className="shorts-video-card">
                        <ShortCard
                          short={short}
                          isActive={isActive}
                          isLiked={isLiked}
                          isBusy={isBusy}
                          isSaved={isSaved}
                          isSaving={isSaving}
                          muted={muted}
                          commentsOpen={isCommentOpen}
                          canGoPrevious={index > 0}
                          onLike={() => handleLike(shortId)}
                          onUnlike={() => handleLike(shortId)}
                          onSave={() => handleSave(shortId)}
                          onComments={() => openComments(shortId)}
                          onNext={goNext}
                          onPrevious={goPrevious}
                          onView={() => {
                            if (!viewRecordedRef.current.has(id)) {
                              viewRecordedRef.current.add(id)
                              rememberSeenShort(id)

                              Promise.resolve(recordView(shortId)).catch(
                                (err) => {
                                  console.error(
                                    'Unable to record Short view:',
                                    err,
                                  )
                                },
                              )
                            }
                          }}
                          onToggleMute={() =>
                            setMuted((previous) => !previous)
                          }
                        />
                      </div>
                    </div>

                    {isCommentOpen && (
                      <div className="shorts-comments-panel">
                        <div className="shorts-comments-header">
                          <div>
                            <span className="shorts-eyebrow">
                              COMMUNITY
                            </span>
                            <h3>Comments</h3>
                          </div>

                          <button
                            type="button"
                            onClick={closeComments}
                            aria-label="Close comments"
                          >
                            <X size={19} />
                          </button>
                        </div>

                        <CommentSection
                          shortId={shortId}
                          onClose={closeComments}
                        />
                      </div>
                    )}
                  </article>
                )
              })}

              {loadingMore && (
                <div className="shorts-load-more">
                  <LoaderCircle className="shorts-spinner" size={25} />
                  <span>Finding more Shorts...</span>
                </div>
              )}

              {!hasMore && shorts.length > 0 && (
                <div className="shorts-end-message">
                  <Sparkles size={24} />
                  <h3>You're all caught up!</h3>
                  <p>
                    You've reached the end of the current Shorts feed.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      const freshOrder = shuffleForThisVisit(shorts)

                      useShortStore.setState({
                        shorts: freshOrder,
                      })

                      activeIndexRef.current = 0
                      navigationTargetRef.current = 0
                      setActiveIndex(0)

                      requestAnimationFrame(() => {
                        cardRefs.current.get(0)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                      })
                    }}
                  >
                    <RefreshCw size={16} />
                    Shuffle again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {actionError && (
        <div className="shorts-toast" role="status">
          <span>{actionError}</span>

          <button
            type="button"
            onClick={() => setActionError('')}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <style>{styles}</style>
    </main>
  )
}

const styles = `
.shorts-page {
  --accent: #ff8a00;
  --accent-light: #ffad42;
  --panel: #0a0a0a;
  --text: #ffffff;
  --muted: #a1a1aa;

  min-height: 100vh;
  background: #000000;
  color: var(--text);
  font-family: inherit;
}

.shorts-page *,
.shorts-page *::before,
.shorts-page *::after {
  box-sizing: border-box;
}

.shorts-header {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  z-index: 1;
  width: 100%;
  min-height: 68px;
  padding: 12px clamp(16px, 4vw, 48px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #000000;
  border-bottom: 1px solid rgba(255,138,0,.16);
}

.shorts-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: white;
  font-size: 18px;
  font-weight: 850;
  text-decoration: none;
}

.shorts-brand-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(255,138,0,.1);
  color: var(--accent);
}

.shorts-create-button,
.shorts-primary-button {
  min-height: 41px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255,138,0,.45);
  border-radius: 11px;
  background: #111111;
  color: var(--accent-light);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  transition: .2s ease;
}

.shorts-create-button:hover,
.shorts-primary-button:hover {
  background: rgba(255,138,0,.12);
  border-color: var(--accent);
  color: white;
  transform: translateY(-2px);
}

.shorts-feed-section {
  width: min(100% - 40px, 1200px);
  margin: 0 auto;
  padding-top: 28px;
}

.shorts-layout {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 12px 50px;
}

.shorts-feed {
  width: min(100%, 1120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}

.shorts-feed-item {
  width: 100%;
  max-width: 850px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 22px;
  scroll-margin-top: 92px;
  transition: max-width .35s ease;
}

.shorts-feed-item.has-comments {
  max-width: 1120px;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 390px);
}

.shorts-video-column {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shorts-video-card {
  width: 100%;
  min-width: 0;
  display: flex;
  justify-content: center;
  transition: transform .35s ease;
}

.shorts-feed-item.has-comments .shorts-video-card {
  transform: translateX(-5px);
}

.shorts-comments-panel {
  width: 100%;
  min-width: 0;
  max-height: min(720px, calc(100vh - 120px));
  overflow-y: auto;
  margin-top: 0;
  padding: 18px;
  border: 1px solid rgba(255,138,0,.2);
  border-radius: 16px;
  background: #090909;
  animation: comments-slide-in .3s ease;
}

.shorts-comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.shorts-comments-header h3 {
  margin: 5px 0 0;
  font-size: 17px;
}

.shorts-comments-header button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,138,0,.2);
  border-radius: 10px;
  background: #111111;
  color: white;
  cursor: pointer;
}

.shorts-comments-header button:hover {
  background: rgba(255,138,0,.12);
  color: var(--accent);
}

.shorts-eyebrow {
  color: var(--accent-light);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
}

@keyframes comments-slide-in {
  from {
    opacity: 0;
    transform: translateX(18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.shorts-comments-panel::-webkit-scrollbar {
  width: 5px;
}

.shorts-comments-panel::-webkit-scrollbar-thumb {
  background: #75400d;
  border-radius: 10px;
}

.shorts-state {
  min-height: 42vh;
  padding: 35px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  text-align: center;
}

.shorts-state > svg {
  color: var(--accent);
}

.shorts-state h2 {
  margin: 0;
  font-size: 23px;
}

.shorts-state p {
  max-width: 420px;
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.shorts-load-more,
.shorts-end-message {
  width: 100%;
  padding: 25px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.shorts-end-message > svg {
  color: var(--accent);
}

.shorts-end-message h3 {
  margin: 0;
  color: white;
  font-size: 18px;
}

.shorts-end-message p {
  margin: 0;
}

.shorts-end-message button {
  min-height: 39px;
  padding: 9px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255,138,0,.4);
  border-radius: 10px;
  background: #111111;
  color: var(--accent-light);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: .2s ease;
}

.shorts-end-message button:hover {
  background: rgba(255,138,0,.12);
  border-color: var(--accent);
  color: white;
}

.shorts-spinner {
  color: var(--accent);
  animation: shorts-spin 1s linear infinite;
}

@keyframes shorts-spin {
  to {
    transform: rotate(360deg);
  }
}

.shorts-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 110;
  max-width: min(420px, calc(100vw - 40px));
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(255,138,0,.4);
  border-radius: 12px;
  background: #090909;
  color: white;
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
  font-size: 13px;
}

.shorts-toast button {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--accent-light);
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

  .shorts-feed-section {
    width: calc(100% - 24px);
    padding-top: 20px;
  }

  .shorts-layout {
    padding: 0 2px 35px;
  }

  .shorts-feed {
    width: 100%;
    gap: 35px;
  }

  .shorts-feed-item,
  .shorts-feed-item.has-comments {
    width: 100%;
    max-width: 100%;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .shorts-video-column {
    width: 100%;
    justify-content: center;
  }

  .shorts-video-card {
    width: 100%;
    max-width: 100%;
    justify-content: center;
    transition:
      width .35s ease,
      max-width .35s ease,
      transform .35s ease;
  }

  .shorts-feed-item.has-comments .shorts-video-column {
    width: 100%;
  }

  .shorts-feed-item.has-comments .shorts-video-card {
    width: 76%;
    max-width: 280px;
    transform: none;
  }

  .shorts-comments-panel {
    width: 100%;
    max-height: 70vh;
    margin-top: 0;
    padding: 14px;
    overflow-y: auto;
    animation: mobile-comments-open .35s ease;
  }

  @keyframes mobile-comments-open {
    from {
      opacity: 0;
      transform: translateY(15px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
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
