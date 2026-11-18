
import { useCallback, useEffect, useState } from 'react'
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import Lenis from 'lenis'

import 'lenis/dist/lenis.css'

import Intro from './components/Intro'

import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Footer from './components/layout/Footer'

import Home from './pages/Home'
import Explore from './pages/Explore'
import Watch from './pages/Watch'
import Shorts from './pages/Shorts'
import Upload from './pages/Upload'
import AnimeDetails from './pages/AnimeDetails'
import Search from './pages/Search'
import MyVault from './pages/MyVault'
import Channels from './pages/Channels'
import Profile from './pages/Profile'
import Channel from './pages/Channel'
import AuthPage from './pages/AuthPage'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

import { useAuthStore } from './features/auth/authStore'

function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      lerp: 0.1,
    })

    let animationFrameId

    function raf(time) {
      lenis.raf(time)
      animationFrameId = requestAnimationFrame(raf)
    }

    animationFrameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lenis.destroy()
    }
  }, [])

  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname])

  return null
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#080808]">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-xl font-black text-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.2)]">
          AV
        </div>

        <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-400" />

        <p className="mt-5 text-xs font-bold tracking-[4px] text-orange-300">
          LOADING ANIME VAULT
        </p>
      </div>
    </div>
  )
}

function AppLayout() {
  const location = useLocation()

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/signup'

  if (isAuthRoute) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className="min-h-screen min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/explore" element={<Explore />} />

            <Route path="/watch/:id" element={<Watch />} />

            <Route path="/shorts" element={<Shorts />} />
            <Route path="/shorts/:shortId" element={<Shorts />} />

            <Route path="/upload" element={<Upload />} />

            <Route path="/anime/:id" element={<AnimeDetails />} />

            <Route path="/search" element={<Search />} />

            <Route path="/my-vault" element={<MyVault />} />

            <Route path="/channels" element={<Channels />} />

            <Route path="/channel/:userId" element={<Channel />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />

            <Route path="/settings" element={<Settings />} />

            <Route
              path="/admin"
              element={<Home />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

export default function App() {
  const [introCompleted, setIntroCompleted] = useState(false)

  const navigate = useNavigate()

  const initialized = useAuthStore((state) => state.initialized)

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  )

  const listenToAuthChanges = useAuthStore(
    (state) => state.listenToAuthChanges,
  )

  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth,
  )

  useEffect(() => {
    listenToAuthChanges()
    initializeAuth()
  }, [listenToAuthChanges, initializeAuth])

  const handleIntroEnter = useCallback(() => {
    setIntroCompleted(true)

    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (!initialized) {
    return <LoadingScreen />
  }

  if (!introCompleted && !isAuthenticated) {
    return (
      <Intro
        onEnter={handleIntroEnter}
        autoEnter
      />
    )
  }

  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <AppLayout />
    </>
  )
}
