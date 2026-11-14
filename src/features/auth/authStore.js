import { create } from 'zustand'
import { authService } from './authService'
import profileService from '../profile/profileService'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,

  isAuthenticated: false,
  isLoading: true,
  isSubmitting: false,
  isLoadingProfile: false,

  error: '',
  successMessage: '',
  initialized: false,
  authSubscription: null,

  authRevision: 0,
  profileRequestId: 0,

  setProfile: (profile) => {
    set({ profile })
  },

  initializeAuth: async () => {
    if (get().initialized) return

    const startingRevision = get().authRevision

    set({
      isLoading: true,
      error: '',
    })

    try {
      const session = await authService.getSession()

      if (get().authRevision !== startingRevision) return

      const user = session?.user
        ? await authService.getCurrentUser()
        : null

      if (get().authRevision !== startingRevision) return

      set((state) => ({
        authRevision: state.authRevision + 1,
        profileRequestId: state.profileRequestId + 1,
        session: session || null,
        user: user || null,
        isAuthenticated: Boolean(session && user),
        initialized: true,
        isLoading: false,
        profile: null,
        isLoadingProfile: false,
        error: '',
      }))

      if (user) {
        setTimeout(() => {
          void get().fetchMyProfile()
        }, 0)
      }
    } catch (error) {
      if (get().authRevision !== startingRevision) return

      console.error('Failed to restore auth session:', error)

      set((state) => ({
        authRevision: state.authRevision + 1,
        profileRequestId: state.profileRequestId + 1,
        session: null,
        user: null,
        profile: null,
        isAuthenticated: false,
        initialized: true,
        isLoading: false,
        isLoadingProfile: false,
        error: error?.message || 'Could not restore your session.',
      }))
    }
  },

  listenToAuthChanges: () => {
    if (get().authSubscription) return

    const { data, error } = authService.onAuthStateChange(
      (event, session) => {
        const user = session?.user || null

        console.log('[Auth event]', {
          event,
          hasSession: Boolean(session),
          userId: user?.id || null,
        })

        if (event === 'SIGNED_OUT') {
          set((state) => ({
            authRevision: state.authRevision + 1,
            profileRequestId: state.profileRequestId + 1,
            user: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            initialized: true,
            isLoading: false,
            isLoadingProfile: false,
            error: '',
            successMessage: '',
          }))

          return
        }

        if (event === 'INITIAL_SESSION' && !user) {
          set((state) => ({
            authRevision: state.authRevision + 1,
            profileRequestId: state.profileRequestId + 1,
            user: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            initialized: true,
            isLoading: false,
            isLoadingProfile: false,
          }))

          return
        }

        if (!session || !user) {
          console.warn('[Auth event] No valid session:', event)
          return
        }

        const currentUserId = get().user?.id
        const accountChanged = currentUserId !== user.id

        const shouldFetchProfile =
          accountChanged ||
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED'

        set((state) => ({
          authRevision: state.authRevision + 1,

          profileRequestId: accountChanged
            ? state.profileRequestId + 1
            : state.profileRequestId,

          user,
          session,
          isAuthenticated: true,
          initialized: true,
          isLoading: false,
          error: '',

          ...(accountChanged
            ? {
                profile: null,
                isLoadingProfile: false,
              }
            : {}),
        }))

        if (shouldFetchProfile) {
          setTimeout(() => {
            const currentState = get()

            if (
              currentState.user?.id === user.id &&
              currentState.profile?.id !== user.id &&
              !currentState.isLoadingProfile
            ) {
              void get().fetchMyProfile()
            }
          }, 0)
        }
      }
    )

    if (error) {
      console.error('Auth subscription error:', error)
      return
    }

    set({
      authSubscription: data.subscription,
    })
  },

  stopListeningToAuthChanges: () => {
    const subscription = get().authSubscription

    if (subscription) {
      subscription.unsubscribe()
    }

    set({
      authSubscription: null,
    })
  },

  fetchMyProfile: async () => {
    const user = get().user

    if (!user?.id) {
      set({
        profile: null,
        isLoadingProfile: false,
      })

      return null
    }

    if (get().isLoadingProfile) {
      return null
    }

    const requestId = get().profileRequestId + 1

    set({
      profileRequestId: requestId,
      isLoadingProfile: true,
    })

    try {
      const result = await profileService.getOrCreateProfile(user)

      if (
        get().user?.id !== user.id ||
        get().profileRequestId !== requestId
      ) {
        return null
      }

      if (result?.error) {
        set({
          error: result.error.message || 'Could not load your profile.',
        })

        return null
      }

      set({
        profile: result?.data || null,
        error: '',
      })

      return result?.data || null
    } catch (error) {
      if (
        get().user?.id === user.id &&
        get().profileRequestId === requestId
      ) {
        set({
          error: error?.message || 'Could not load your profile.',
        })
      }

      return null
    } finally {
      if (
        get().user?.id === user.id &&
        get().profileRequestId === requestId
      ) {
        set({
          isLoadingProfile: false,
        })
      }
    }
  },

  updateMyProfile: async (profileData) => {
    const user = get().user

    if (!user?.id) {
      set({
        error: 'You must be signed in to update your profile.',
      })

      return null
    }

    const requestId = get().profileRequestId + 1

    set({
      profileRequestId: requestId,
      isLoadingProfile: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await profileService.updateProfile(
        user.id,
        profileData
      )

      if (
        get().user?.id !== user.id ||
        get().profileRequestId !== requestId
      ) {
        return null
      }

      if (result?.error) {
        set({
          error: result.error.message || 'Could not update your profile.',
        })

        return null
      }

      set({
        profile: result?.data || null,
        successMessage: 'Profile updated successfully.',
      })

      return result?.data || null
    } catch (error) {
      if (
        get().user?.id === user.id &&
        get().profileRequestId === requestId
      ) {
        set({
          error: error?.message || 'Could not update your profile.',
        })
      }

      return null
    } finally {
      if (
        get().user?.id === user.id &&
        get().profileRequestId === requestId
      ) {
        set({
          isLoadingProfile: false,
        })
      }
    }
  },

  signUp: async (credentials) => {
    if (get().isSubmitting) {
      return {
        success: false,
        error: 'Please wait for the current request to finish.',
      }
    }

    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.signUp(credentials)

      if (!result?.user) {
        const message =
          'Supabase did not return a user. Check your signup configuration.'

        set({ error: message })

        return {
          success: false,
          error: message,
        }
      }

      const user = result.user
      const session = result.session || null
      const isSignedIn = Boolean(session && user)

      set((state) => ({
        authRevision: state.authRevision + 1,
        profileRequestId: state.profileRequestId + 1,
        user: isSignedIn ? user : null,
        session,
        isAuthenticated: isSignedIn,
        initialized: true,
        isLoading: false,
        profile: null,
        isLoadingProfile: false,
        successMessage: result.successMessage || '',
        error: '',
      }))

      if (isSignedIn) {
        setTimeout(() => {
          void get().fetchMyProfile()
        }, 0)
      }

      return {
        ...result,
        success: true,
      }
    } catch (error) {
      console.error('SUPABASE SIGNUP ERROR:', error)

      const message = error?.message || 'Could not create your account.'

      set({ error: message })

      return {
        success: false,
        error: message,
      }
    } finally {
      set({ isSubmitting: false })
    }
  },

  signIn: async (credentials) => {
    if (get().isSubmitting) {
      return {
        success: false,
        error: 'Please wait for the current request to finish.',
      }
    }

    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.signIn(credentials)

      if (!result?.user || !result?.session) {
        const message = 'Could not establish a signed-in session.'

        set({ error: message })

        return {
          success: false,
          error: message,
        }
      }

      set((state) => ({
        authRevision: state.authRevision + 1,
        profileRequestId: state.profileRequestId + 1,
        user: result.user,
        session: result.session,
        isAuthenticated: true,
        initialized: true,
        isLoading: false,
        profile: null,
        isLoadingProfile: false,
        error: '',
      }))

      setTimeout(() => {
        void get().fetchMyProfile()
      }, 0)

      return {
        ...result,
        success: true,
      }
    } catch (error) {
      console.error('SUPABASE LOGIN ERROR:', error)

      const message = error?.message || 'Could not sign in.'

      set({ error: message })

      return {
        success: false,
        error: message,
      }
    } finally {
      set({ isSubmitting: false })
    }
  },

  signOut: async () => {
    if (get().isSubmitting) return false

    set({
      isSubmitting: true,
      error: '',
    })

    try {
      await authService.signOut()

      set((state) => ({
        authRevision: state.authRevision + 1,
        profileRequestId: state.profileRequestId + 1,
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        initialized: true,
        isLoading: false,
        isLoadingProfile: false,
        successMessage: '',
        error: '',
      }))

      return true
    } catch (error) {
      set({
        error: error?.message || 'Could not sign out.',
      })

      return false
    } finally {
      set({ isSubmitting: false })
    }
  },

  resetPassword: async (email) => {
    if (get().isSubmitting) return false

    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      await authService.resetPassword(email)

      set({
        successMessage: 'Password reset email sent.',
      })

      return true
    } catch (error) {
      set({
        error: error?.message || 'Could not send reset email.',
      })

      return false
    } finally {
      set({ isSubmitting: false })
    }
  },

  updatePassword: async (password) => {
    if (get().isSubmitting) return null

    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.updatePassword(password)

      set({
        successMessage: 'Password updated successfully.',
      })

      return result
    } catch (error) {
      set({
        error: error?.message || 'Could not update your password.',
      })

      return null
    } finally {
      set({ isSubmitting: false })
    }
  },

  clearProfile: () => {
    set((state) => ({
      profile: null,
      profileRequestId: state.profileRequestId + 1,
      isLoadingProfile: false,
    }))
  },

  clearError: () => {
    set({ error: '' })
  },

  clearMessages: () => {
    set({
      error: '',
      successMessage: '',
    })
  },
}))

export default useAuthStore