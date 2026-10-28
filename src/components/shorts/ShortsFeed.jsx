import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PlaySquare,
  RefreshCw,
  Upload,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
} from 'lucide-react'

import ShortCard from '../../components/shorts/ShortCard'
import { useShortStore } from './shortsStore'

export default function ShortsFeed() {
  const shorts = useShortStore((state) => state.shorts)
  const isLoading = useShortStore((state) => state.isLoading)
  const error = useShortStore((state) => state.error)
  const fetchShorts = useShortStore((state) => state.fetchShorts)

  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(false)

  const feedRef = useRef(null)
  const slideRefs = useRef([])
  const activeIndexRef = useRef(0)
  const wheelLockedRef = useRef(false)
  const wheelTimerRef = useRef(null)
  const touchStartRef = useRef(null)

  const loadFeed = useCallback(
    async (isRefresh = false) => {
      setLoadError('')

      if (isRefresh) {
        setRefreshing(true)
      }

      try {
        await fetchShorts()
      } catch (err) {
        setLoadError(
          err?.message || 'Could not load Shorts. Please try again.'
        )
      } finally {
        setRefreshing(false)
      }
    },
    [fetchShorts]
  )

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const publishedShorts = (shorts ?? []).filter(
    (short) => short && short.status === 'published'
  )

  const showLoading = isLoading && publishedShorts.length === 0

  const goToShort = useCallback(
    (index) => {
      if (publishedShorts.length === 0) return

      const nextIndex = Math.max(
        0,
        Math.min(index, publishedShorts.length - 1)
      )

      activeIndexRef.current = nextIndex
      setActiveIndex(nextIndex)

      const slide = slideRefs.current[nextIndex]
      const feed = feedRef.current

      if (!slide || !feed) return

      feed.scrollTo({
        top: slide.offsetTop - feed.offsetTop,
        behavior: 'smooth',
      })
    },
    [publishedShorts.length]
  )

  // Keep the active Short synchronized with vertical scrolling.
  useEffect(() => {
    const feed = feedRef.current

    if (!feed || publishedShorts.length === 0) return

    const slides = slideRefs.current.filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSlides = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )

        if (visibleSlides.length === 0) return

        const index = Number(
          visibleSlides[0].target.dataset.shortIndex
        )

        if (!Number.isNaN(index)) {
          activeIndexRef.current = index
          setActiveIndex(index)
        }
      },
      {
        root: feed,
        threshold: [0.25, 0.5, 0.65, 0.85],
      }
    )

    slides.forEach((slide) => observer.observe(slide))

    return () => observer.disconnect()
  }, [publishedShorts.length])

  // Reset the active slide if the feed contents change.
  useEffect(() => {
    activeIndexRef.current = 0
    setActiveIndex(0)

    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
  }, [publishedShorts.length])

  useEffect(() => {
    return () => {
      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current)
      }
    }
  }, [])

  // Mouse-wheel navigation moves one Short at a time.
  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) < 10) return

    event.preventDefault()

    if (wheelLockedRef.current) return

    wheelLockedRef.current = true

    const direction = event.deltaY > 0 ? 1 : -1

    goToShort(activeIndexRef.current + direction)

    wheelTimerRef.current = window.setTimeout(() => {
      wheelLockedRef.current = false
    }, 650)
  }

  // Touch gestures navigate to the next or previous Short.
  const handleTouchStart = (event) => {
    const touch = event.touches[0]

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event) => {
    if (!touchStartRef.current) return

    const touch = event.changedTouches[0]
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaX = touch.clientX - touchStartRef.current.x

    touchStartRef.current = null

    // Ignore horizontal swipes and small movements.
    if (Math.abs(deltaY) < 55) return
    if (Math.abs(deltaX) > Math.abs(deltaY)) return

    goToShort(
      activeIndexRef.current + (deltaY < 0 ? 1 : -1)
    )
  }

  const handleKeyDown = (event) => {
    if (
      event.target instanceof HTMLElement &&
      ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(
        event.target.tagName
      )
    ) {
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault()
      goToShort(activeIndexRef.current + 1)
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault()
      goToShort(activeIndexRef.current - 1)
    }
  }

  return (
    <main className="min-w-0 flex-1 space-y-5 p-3 sm:p-5 lg:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vault-purple/20 text-vault-accent">
            <PlaySquare size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-vault-text">
              Anime Shorts
            </h1>

            <p className="mt-1 text-sm text-vault-muted">
              Swipe to discover your next anime moment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? 'Turn sound on' : 'Mute all Shorts'}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-vault-text transition hover:bg-white/5"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="hidden sm:inline">
              {muted ? 'Sound off' : 'Sound on'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => loadFeed(true)}
            disabled={refreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-vault-text transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing || isLoading ? 'animate-spin' : ''
              }
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-vault-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vault-purple/80"
          >
            <Upload size={16} />
            <span>Upload</span>
          </Link>
        </div>
      </header>

      {/* Error state */}
      {(loadError || error) && publishedShorts.length === 0 && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <p className="text-sm text-red-300">
              {loadError || error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadFeed(true)}
            disabled={refreshing || isLoading}
            className="shrink-0 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {showLoading && (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading Shorts"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-2xl border border-white/5 bg-vault-surface"
            >
              <div className="aspect-[9/16] max-h-[520px] bg-white/5" />

              <div className="flex items-center gap-3 p-3">
                <div className="h-8 w-8 rounded-full bg-white/10" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-white/10" />
                  <div className="h-2 w-32 rounded bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showLoading &&
        publishedShorts.length === 0 &&
        !loadError &&
        !error && (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-vault-surface/50 px-6 py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vault-purple/15 text-vault-accent">
              <PlaySquare size={30} />
            </div>

            <h2 className="text-lg font-bold text-vault-text">
              No Shorts yet
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-vault-muted">
              Be among the first to share an anime moment with the Anime Vault community.
            </p>

            <Link
              to="/upload"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-vault-purple px-4 py-3 text-sm font-semibold text-white transition hover:bg-vault-purple/80"
            >
              <Upload size={17} />
              Upload your first Short
            </Link>
          </div>
        )}

      {/* One-Short-at-a-time feed */}
      {!showLoading && publishedShorts.length > 0 && (
        <section aria-label="Anime Shorts player">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-vault-muted">
              Short {activeIndex + 1} of {publishedShorts.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToShort(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Previous Short"
                className="rounded-full border border-white/10 bg-vault-surface p-2 text-vault-text transition hover:bg-vault-purple disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronUp size={20} />
              </button>

              <button
                type="button"
                onClick={() => goToShort(activeIndex + 1)}
                disabled={activeIndex >= publishedShorts.length - 1}
                aria-label="Next Short"
                className="rounded-full border border-white/10 bg-vault-surface p-2 text-vault-text transition hover:bg-vault-purple disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          <div
            ref={feedRef}
            tabIndex={0}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onKeyDown={handleKeyDown}
            className="mx-auto h-[min(76vh,850px)] min-h-[480px] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-vault-accent"
            style={{
              scrollSnapType: 'y mandatory',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {publishedShorts.map((short, index) => (
              <section
                key={short.id}
                ref={(element) => {
                  slideRefs.current[index] = element
                }}
                data-short-index={index}
                aria-label={`Short ${index + 1}`}
                className="flex min-h-full w-full items-center justify-center py-2"
                style={{
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
                }}
              >
                <div className="w-full max-w-xl">
                  <ShortCard
                    short={short}
                    isActive={activeIndex === index}
                    muted={muted}
                    onToggleMute={() => setMuted((value) => !value)}
                    onPrevious={() => goToShort(index - 1)}
                    onNext={() => goToShort(index + 1)}
                  />
                </div>
              </section>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-vault-muted">
            Swipe up or down, use your mouse wheel, or tap the arrows to change Shorts.
          </p>
        </section>
      )}
    </main>
  )
}