
import { supabase } from '../../lib/supabase'

const getClient = () => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Check your environment variables.'
    )
  }

  return supabase
}

const throwIfError = (error) => {
  if (error) {
    console.error('SUPABASE AUTH ERROR:', error)
    throw error
  }
}

const normalizeUser = (user) => {
  if (!user) return null

  const metadata = user.user_metadata || {}

  return {
    ...user,
    id: user.id,
    email: user.email || '',
    username:
      metadata.username ||
      metadata.preferred_username ||
      metadata.user_name ||
      metadata.name ||
      '',
    display_name:
      metadata.display_name ||
      metadata.full_name ||
      metadata.name ||
      metadata.username ||
      '',
    favorite_anime: metadata.favorite_anime || '',
    avatar_url:
      metadata.avatar_url ||
      metadata.picture ||
      '',
  }
}

const SUPPORTED_PROVIDERS = ['google', 'github']

export const authService = {
  async signUp({
    email,
    password,
    username,
    favoriteAnime,
  }) {
    const client = getClient()

    const cleanEmail = email?.trim().toLowerCase()
    const cleanUsername = username?.trim()
    const cleanFavoriteAnime = favoriteAnime?.trim() || ''

    if (!cleanEmail || !password || !cleanUsername) {
      throw new Error(
        'Username, email, and password are required.'
      )
    }

    if (password.length < 6) {
      throw new Error(
        'Your password must contain at least 6 characters.'
      )
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          favorite_anime: cleanFavoriteAnime,
        },
      },
    })

    throwIfError(error)

    if (!data?.user) {
      throw new Error(
        'Supabase did not return a user. Please try again.'
      )
    }

    const identities = data.user.identities

    console.log('SUPABASE SIGNUP RESPONSE:', {
      userId: data.user.id,
      email: data.user.email,
      hasSession: Boolean(data.session),
      identitiesCount: identities?.length ?? null,
    })

    if (Array.isArray(identities) && identities.length === 0) {
      throw new Error(
        'This email may already be registered. Try logging in or use another email address.'
      )
    }

    const user = normalizeUser(data.user)
    const session = data.session || null

    return {
      user,
      session,
      needsEmailConfirmation: !session,
      success: true,
      successMessage: session
        ? 'Your account has been created successfully!'
        : 'Your account has been created. Check your email for a confirmation link before signing in.',
    }
  },

  async signIn({ email, password }) {
    const client = getClient()

    const cleanEmail = email?.trim().toLowerCase()

    if (!cleanEmail || !password) {
      throw new Error(
        'Email and password are required.'
      )
    }

    const { data, error } =
      await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    throwIfError(error)

    if (!data?.user || !data?.session) {
      throw new Error(
        'Supabase did not return a valid login session.'
      )
    }

    return {
      user: normalizeUser(data.user),
      session: data.session,
      success: true,
    }
  },

  async signInWithProvider(provider) {
    const client = getClient()

    const cleanProvider = provider?.toLowerCase()

    if (!SUPPORTED_PROVIDERS.includes(cleanProvider)) {
      throw new Error(
        'Unsupported provider. Choose Google or GitHub.'
      )
    }

    const redirectTo = `${window.location.origin}/`

    const { data, error } =
      await client.auth.signInWithOAuth({
        provider: cleanProvider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      })

    throwIfError(error)

    return {
      data,
      success: true,
    }
  },

  async signOut() {
    const client = getClient()

    const { error } = await client.auth.signOut()

    throwIfError(error)

    return true
  },

  async getSession() {
    const client = getClient()

    const { data, error } = await client.auth.getSession()

    throwIfError(error)

    return data.session || null
  },

  async getCurrentUser() {
    const client = getClient()

    const { data, error } = await client.auth.getUser()

    throwIfError(error)

    return normalizeUser(data.user)
  },

  async updateUserMetadata(metadata) {
    const client = getClient()

    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata)
    ) {
      throw new Error(
        'Valid user metadata is required.'
      )
    }

    const { data, error } = await client.auth.updateUser({
      data: metadata,
    })

    throwIfError(error)

    return normalizeUser(data.user)
  },

  async updateFavoriteAnime(favoriteAnime) {
    return authService.updateUserMetadata({
      favorite_anime: favoriteAnime?.trim() || '',
    })
  },

  async resetPassword(email) {
    const client = getClient()

    const cleanEmail = email?.trim().toLowerCase()

    if (!cleanEmail) {
      throw new Error(
        'Please enter your email address.'
      )
    }

    const { error } =
      await client.auth.resetPasswordForEmail(cleanEmail)

    throwIfError(error)

    return true
  },

  async updatePassword(password) {
    const client = getClient()

    if (!password || password.length < 6) {
      throw new Error(
        'Your new password must contain at least 6 characters.'
      )
    }

    const { data, error } = await client.auth.updateUser({
      password,
    })

    throwIfError(error)

    return normalizeUser(data.user)
  },

  onAuthStateChange(callback) {
    const client = getClient()

    if (typeof callback !== 'function') {
      throw new Error(
        'Auth state callback must be a function.'
      )
    }

    return client.auth.onAuthStateChange(callback)
  },
}

export default authService
