import { useEffect, useState } from 'react'

export default function Intro({ onEnter, autoEnter = false }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [imageError, setImageError] = useState(false)

  const logo = `${import.meta.env.BASE_URL}intro.png`

  useEffect(() => {
    if (!imageLoaded) return

    const contentTimer = setTimeout(() => {
      setShowContent(true)
    }, 500)

    let buttonTimer
    let enterTimer

    if (!autoEnter) {
      buttonTimer = setTimeout(() => {
        setShowButton(true)
      }, 1200)
    } else {
      enterTimer = setTimeout(() => {
        onEnter?.()
      }, 5000)
    }

    return () => {
      clearTimeout(contentTimer)

      if (buttonTimer) clearTimeout(buttonTimer)
      if (enterTimer) clearTimeout(enterTimer)
    }
  }, [imageLoaded, autoEnter, onEnter])

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoaded(true)
    setImageError(true)
  }

  return (
    <main className="fixed inset-0 z-[9999] min-h-screen overflow-hidden bg-[#07050d] text-white">
      <div className="absolute inset-0">
        {!imageError ? (
          <img
            src={logo}
            alt="Anime Vault"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="h-full w-full animate-[introZoom_12s_ease-out_forwards] object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#07050d] via-[#1a0b2e] to-[#07050d]" />
        )}
      </div>

      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050d] via-transparent to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07050d]/40 via-transparent to-[#07050d]/30" />

      <div className="absolute -bottom-40 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-purple-700/25 blur-[130px]" />

      {!imageLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#07050d]">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-400" />

            <p className="mt-5 text-xs font-bold tracking-[4px] text-purple-300">
              LOADING ANIME VAULT
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-5 pb-16 text-center sm:pb-20">
        <div
          className={`transition-all duration-1000 ${
            showContent
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
        >
          <p className="text-[10px] font-bold tracking-[5px] text-purple-200 sm:text-xs sm:tracking-[8px]">
            YOUR ANIME UNIVERSE
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-[3px] drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] sm:text-5xl sm:tracking-[6px]">
            ENTER THE VAULT
          </h1>

          <p className="mx-auto mt-4 max-w-md text-xs leading-6 text-gray-200 sm:text-sm">
            Discover new worlds. Explore unforgettable stories.
            Experience anime like never before.
          </p>
        </div>

        {!autoEnter && (
          <div
            className={`mt-9 transition-all duration-1000 ${
              showButton
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-8 opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={onEnter}
              disabled={!imageLoaded}
              className="group flex min-w-[220px] items-center justify-center gap-5 rounded-full border border-purple-300/70 bg-gradient-to-r from-purple-800 to-purple-600 px-9 py-4 text-xs font-black tracking-[3px] shadow-[0_0_30px_rgba(147,51,234,0.45)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_0_55px_rgba(168,85,247,0.8)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              GET STARTED

              <span className="text-xl transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>
            </button>
          </div>
        )}

        {autoEnter && imageLoaded && (
          <div className="mt-9 flex items-center gap-3 text-xs tracking-[3px] text-purple-200">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400/20 border-t-purple-300" />

            PREPARING YOUR VAULT
          </div>
        )}

        <div className="mt-10 flex items-center gap-3 text-[8px] font-semibold tracking-[3px] text-purple-200/60 sm:text-[9px] sm:tracking-[5px]">
          <span>DISCOVER</span>

          <span className="h-1 w-1 rounded-full bg-purple-400" />

          <span>EXPLORE</span>

          <span className="h-1 w-1 rounded-full bg-purple-400" />

          <span>EXPERIENCE</span>
        </div>
      </div>

      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 sm:left-10 sm:top-8">
        {!imageError ? (
          <img
            src={logo}
            alt="Anime Vault Logo"
            onError={handleImageError}
            className="h-10 w-10 rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-400/30 bg-purple-600/20 text-sm font-black text-purple-300">
            AV
          </div>
        )}

        <span className="text-xs font-black tracking-[3px] text-white">
          ANIME VAULT
        </span>
      </div>

      <style>
        {`
          @keyframes introZoom {
            from {
              transform: scale(1);
            }

            to {
              transform: scale(1.08);
            }
          }
        `}
      </style>
    </main>
  )
}