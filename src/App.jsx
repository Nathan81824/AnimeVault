
import { useCallback, useEffect, useState } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'

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

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#07050d]">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-xl font-black text-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.2)]">
          AV
        </div>

        <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-400" />

        <p className="mt-5 text-xs font-bold tracking-[4px] text-purple-300">
          LOADING ANIME VAULT
        </p>
      </div>
    </div>
  )
}

function AppLayout() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/signup'

  if (isAuthRoute) {
    return <AuthPage />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#07050d] text-white">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className="min-h-screen min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/search" element={<Search />} />
            <Route path="/my-vault" element={<MyVault />} />

            <Route path="/channels" element={<Channels />} />
            <Route path="/channel/:userId" element={<Channel />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />

            <Route path="/settings" element={<Settings />} />

            <Route
              path="/admin"
              element={<Navigate to="/" replace />}
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

  const {
    initialized,
    listenToAuthChanges,
    initializeAuth,
    isAuthenticated,
  } = useAuthStore()

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
    return <Intro onEnter={handleIntroEnter} autoEnter />
  }

  return <AppLayout />
}
