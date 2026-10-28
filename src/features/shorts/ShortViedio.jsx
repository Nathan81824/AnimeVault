
import { useEffect, useRef, useState } from 'react'

export default function ShortVideo({
  src,
  poster,
  className = '',
  muted = true,
  loop = true,
  onEnded,
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current

    if (!container || !video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio >= 0.6

        setIsActive(active)

        if (active) {
          video.play().catch(() => {
            // Browser may require user interaction before playback.
          })
        } else {
          video.pause()
        }
      },
      {
        threshold: [0, 0.25, 0.6, 0.9, 1],
      },
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!isActive) {
      video.pause()
    }
  }, [isActive])

  return (
    <div ref={containerRef} className="short-video-container">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={className}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        onEnded={onEnded}
        controls
      />
    </div>
  )
}
`