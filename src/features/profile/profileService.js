
import { supabase } from '../../lib/supabase'

const PROFILE_TABLE = 'profiles'

function normalizeProfile(profile) {
  if (!profile) return null

  return {
    ...profile,
    id: profile.id,
    username: profile.username ?? '',
    display_name: profile.display_name ?? '',
    avatar_url: profile.avatar_url ?? null,
    bio: profile.bio ?? '',
    website: profile.website ?? '',
  }
}

export const profileService = {
  /**
   * Get a user's profile by their Supabase Auth ID.
   */
  async getProfile(userId) {
    if (!userId) {
      return { data: null, error: new Error('User ID is required') }
    }

    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch profile:', error)
      return { data: null, error }
    }

    return { data: normalizeProfile(data), error: null }
  },

  /**
   * Create a profile if one does not already exist.
   */
  async createProfile(user, initialData = {}) {
    if (!user?.id) {
      return { data: null, error: new Error('Authenticated user is required') }
    }

    const metadata = user.user_metadata ?? {}

    const username =
      initialData.username ??
      metadata.username ??
      user.email?.split('@')[0] ??
      `user_${user.id.slice(0, 8)}`

    const profileData = {
      id: user.id,
      username,
      display_name:
        initialData.display_name ??
        metadata.display_name ??
        metadata.full_name ??
        username,
      avatar_url:
        initialData.avatar_url ??
        metadata.avatar_url ??
        metadata.picture ??
        null,
      bio: initialData.bio ?? '',
      website: initialData.website ?? '',
    }

    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .upsert(profileData, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to create profile:', error)
      return { data: null, error }
    }

    return { data: normalizeProfile(data), error: null }
  },

  /**
   * Get the profile, creating it if it doesn't exist.
   */
  async getOrCreateProfile(user) {
    if (!user?.id) {
      return { data: null, error: new Error('Authenticated user is required') }
    }

    const result = await this.getProfile(user.id)

    if (result.error) {
      return result
    }

    if (result.data) {
      return result
    }

    return this.createProfile(user)
  },

  /**
   * Update the current user's profile.
   */
  async updateProfile(userId, updates = {}) {
    if (!userId) {
      return { data: null, error: new Error('User ID is required') }
    }

    const allowedFields = [
      'username',
      'display_name',
      'avatar_url',
      'bio',
      'website',
    ]

    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(
        ([key, value]) =>
          allowedFields.includes(key) && value !== undefined
      )
    )

    if (Object.keys(safeUpdates).length === 0) {
      return {
        data: null,
        error: new Error('No valid profile fields were provided'),
      }
    }

    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .update(safeUpdates)
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update profile:', error)
      return { data: null, error }
    }

    return { data: normalizeProfile(data), error: null }
  },

  /**
   * Delete a user's profile.
   */
  async deleteProfile(userId) {
    if (!userId) {
      return { error: new Error('User ID is required') }
    }

    const { error } = await supabase
      .from(PROFILE_TABLE)
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Failed to delete profile:', error)
      return { error }
    }

    return { error: null }
  },
}

export default profileService
