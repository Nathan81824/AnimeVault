
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

  // Prevent stale authentication and profile operations.
  authRevision: 0,
  profileRequestId: 0,

  // Restore the current Supabase session.
  initializeAuth: async () => {
    if (get().initialized) return

    const startingRevision = get().authRevision

    set({ isLoading: true, error: '' })

    try {
      const session = await authService.getSession()

      if (get().authRevision !== startingRevision) return

      const user = session?.user
        ? await authService.getCurrentUser()
        : null

      // Do not overwrite a newer auth event.
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
        void get().fetchMyProfile()
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

  // Subscribe to Supabase authentication changes.
  listenToAuthChanges: () => {
    if (get().authSubscription) return

    const subscription = authService.onAuthStateChange(
      ({ event, session, user }) => {
        console.log('[Auth event]', {
          event,
          hasSession: Boolean(session),
          sessionUserId: session?.user?.id ?? null,
          callbackUserId: user?.id ?? null,
        })

        // Only a confirmed sign-out clears an active session.
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

        // INITIAL_SESSION with no user means no session was restored.
        if (event === 'INITIAL_SESSION' && !session?.user) {
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

        // Never clear an existing user because an event is incomplete.
        if (!session?.user || !user?.id) {
          console.warn(
            '[Auth event] Ignored incomplete session update:',
            event
          )
          return
        }

        const currentUserId = get().user?.id
        const accountChanged = currentUserId !== user.id

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
                isLoadingProfile: true,
              }
            : {}),
        }))

        // Load the profile after updating auth state.
        if (accountChanged || !get().profile) {
          void get().fetchMyProfile()
        }
      }
    )

    set({ authSubscription: subscription })
  },

  // Unsubscribe from Supabase auth changes.
  stopListeningToAuthChanges: () => {
    const subscription = get().authSubscription

    if (subscription) {
      subscription.unsubscribe()
    }

    set({ authSubscription: null })
  },

  // Fetch or create the current user's profile.
  fetchMyProfile: async () => {
    const user = get().user

    if (!user?.id) {
      set({
        profile: null,
        isLoadingProfile: false,
      })
      return null
    }

    const requestId = get().profileRequestId + 1

    set({
      profileRequestId: requestId,
      isLoadingProfile: true,
    })

    try {
      const result = await profileService.getOrCreateProfile(user)

      // Ignore results belonging to a different account or request.
      if (
        get().user?.id !== user.id ||
        get().profileRequestId !== requestId
      ) {
        return null
      }

      if (result?.error) {
        set({
          error:
            result.error.message || 'Could not load your profile.',
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
        set({ isLoadingProfile: false })
      }
    }
  },

  // Update the current user's profile.
  updateMyProfile: async (profileData) => {
    const user = get().user

    if (!user?.id) {
      set({ error: 'You must be signed in to update your profile.' })
      return null
    }

    set({
      isLoadingProfile: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await profileService.updateProfile(
        user.id,
        profileData
      )

      if (get().user?.id !== user.id) return null

      if (result?.error) {
        set({
          error:
            result.error.message || 'Could not update your profile.',
        })
        return null
      }

      set({
        profile: result?.data || null,
        successMessage: 'Profile updated successfully.',
      })

      return result?.data || null
    } catch (error) {
      if (get().user?.id === user.id) {
        set({
          error: error?.message || 'Could not update your profile.',
        })
      }

      return null
    } finally {
      if (get().user?.id === user.id) {
        set({ isLoadingProfile: false })
      }
    }
  },

  // Register a new account.
  signUp: async (credentials) => {
    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.signUp(credentials)

      if (!result) {
        set({ error: 'Could not create your account.' })
        return null
      }

      const user = result.user || null
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
        isLoadingProfile: isSignedIn,
        successMessage: result.successMessage || '',
      }))

      if (isSignedIn) {
        void get().fetchMyProfile()
      }

      return result
    } catch (error) {
      set({
        error: error?.message || 'Could not create your account.',
      })
      return null
    } finally {
      set({ isSubmitting: false })
    }
  },

  // Sign in and update shared auth state.
  signIn: async (credentials) => {
    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.signIn(credentials)

      if (!result?.user || !result?.session) {
        set({
          error: 'Could not establish a signed-in session.',
        })
        return null
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
        isLoadingProfile: true,
      }))

      // Profile loading must not block the signed-in UI.
      void get().fetchMyProfile()

      return result
    } catch (error) {
      set({
        error: error?.message || 'Could not sign in.',
      })
      return null
    } finally {
      set({ isSubmitting: false })
    }
  },

  // Sign out and clear account-specific state.
  signOut: async () => {
    set({
      isSubmitting: true,
      error: '',
    })

    try {
      await authService.signOut()

      // Clear state even if the listener already handled sign-out.
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

  // Send a password reset email.
  resetPassword: async (email) => {
    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.resetPassword(email)

      set({
        successMessage:
          result?.message || 'Password reset email sent.',
      })

      return result
    } catch (error) {
      set({
        error: error?.message || 'Could not send reset email.',
      })
      return null
    } finally {
      set({ isSubmitting: false })
    }
  },

  // Update the current user's password.
  updatePassword: async (password) => {
    set({
      isSubmitting: true,
      error: '',
      successMessage: '',
    })

    try {
      const result = await authService.updatePassword(password)

      set({
        successMessage:
          result?.message || 'Password updated successfully.',
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

  // Clear the profile and invalidate pending profile requests.
  clearProfile: () => {
    set((state) => ({
      profile: null,
      profileRequestId: state.profileRequestId + 1,
    }))
  },

  // Clear the current error.
  clearError: () => set({ error: '' }),

  // Clear messages.
  clearMessages: () =>
    set({
      error: '',
      successMessage: '',
    }),
}))

export default useAuthStore
