
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

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
import Subscriptions from './pages/Subscriptions'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

import { useAuthStore } from './features/auth/authStore'

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

function AppLayout() {
  const location = useLocation()

  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const listenToAuthChanges = useAuthStore(
    (state) => state.listenToAuthChanges,
  )

  useEffect(() => {
    listenToAuthChanges()
    initializeAuth()
  }, [listenToAuthChanges, initializeAuth])

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup'

  const isNotFoundPage = location.pathname === '/404'

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#09090f] text-white">
        <ScrollToTop />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <ScrollToTop />

      <Navbar />

      <div className="flex">
        {!isNotFoundPage && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 md:block">
            <Sidebar className="h-full" />
          </aside>
        )}

        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          <main className="min-h-[70vh]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/anime/:id" element={<AnimeDetails />} />
              <Route path="/search" element={<Search />} />
              <Route path="/my-vault" element={<MyVault />} />
              <Route
                path="/subscriptions"
                element={<Subscriptions />}
              />
              <Route
                path="/profile"
                element={<Navigate to="/login" replace />}
              />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/404" element={<NotFound />} />
              <Route
                path="*"
                element={<Navigate to="/404" replace />}
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>

      {!isNotFoundPage && <MobileNav />}
    </div>
  )
}

export default function App() {
  return <AppLayout />
}
