
import { supabase } from "../../lib/supabase";

const getClient = () => {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check your .env file."
    );
  }

  return supabase;
};

const PROFILE_TABLE = "profiles";

const normalizeProfile = (profile) => {
  if (!profile) return null;

  return {
    id: profile.id,
    username: profile.username || "",
    displayName: profile.display_name || "",
    avatarUrl: profile.avatar_url || null,
    bannerUrl: profile.banner_url || null,
    bio: profile.bio || "",
    website: profile.website || "",
    favoriteAnime: profile.favorite_anime || "",
    createdAt: profile.created_at || null,
    updatedAt: profile.updated_at || null,
  };
};

const getUserMetadata = (user) => {
  return user?.user_metadata || {};
};

const getUsername = (user, initialData = {}) => {
  const metadata = getUserMetadata(user);

  const suppliedUsername =
    initialData.username ||
    user?.username ||
    metadata.username;

  if (suppliedUsername?.trim()) {
    return suppliedUsername.trim();
  }

  const emailPrefix = user?.email?.split("@")[0];

  if (emailPrefix?.trim()) {
    return `${emailPrefix.trim()}-${user.id.slice(0, 6)}`;
  }

  return `user-${user.id.slice(0, 8)}`;
};

const getFavoriteAnime = (user, initialData = {}) => {
  const metadata = getUserMetadata(user);

  return (
    initialData.favorite_anime ??
    initialData.favoriteAnime ??
    user?.favoriteAnime ??
    metadata.favorite_anime ??
    ""
  );
};

const getErrorMessage = (error) => {
  return (
    error?.message ||
    "Something went wrong while managing your profile."
  );
};

const buildProfileData = (user, initialData = {}) => {
  const metadata = getUserMetadata(user);
  const username = getUsername(user, initialData);

  return {
    id: user.id,
    username,
    display_name:
      initialData.display_name ||
      initialData.displayName ||
      user?.name ||
      metadata.display_name ||
      metadata.full_name ||
      username,
    avatar_url:
      initialData.avatar_url ??
      initialData.avatarUrl ??
      user?.avatarUrl ??
      metadata.avatar_url ??
      metadata.picture ??
      null,
    banner_url:
      initialData.banner_url ??
      initialData.bannerUrl ??
      null,
    bio: initialData.bio || "",
    website: initialData.website || "",
    favorite_anime: getFavoriteAnime(user, initialData),
    updated_at: new Date().toISOString(),
  };
};

const profileService = {
  async getProfile(userId) {
    try {
      const client = getClient();

      if (!userId) {
        return {
          data: null,
          error: new Error("A user ID is required."),
        };
      }

      const { data, error } = await client
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        return {
          data: null,
          error,
        };
      }

      return {
        data: normalizeProfile(data),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error,
      };
    }
  },

  async createProfile(user, initialData = {}) {
    try {
      const client = getClient();

      if (!user?.id) {
        return {
          data: null,
          error: new Error("A valid user is required."),
        };
      }

      const profileData = buildProfileData(
        user,
        initialData
      );

      const { data, error } = await client
        .from(PROFILE_TABLE)
        .upsert(profileData, {
          onConflict: "id",
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error,
        };
      }

      return {
        data: normalizeProfile(data),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error,
      };
    }
  },

  async getOrCreateProfile(user) {
    if (!user?.id) {
      return {
        data: null,
        error: new Error("A valid user is required."),
      };
    }

    const existingProfile = await this.getProfile(user.id);

    if (existingProfile.error) {
      return existingProfile;
    }

    if (existingProfile.data) {
      return existingProfile;
    }

    return this.createProfile(user);
  },

  async updateProfile(userId, profileData = {}) {
    try {
      const client = getClient();

      if (!userId) {
        return {
          data: null,
          error: new Error("A user ID is required."),
        };
      }

      const allowedFields = {
        username: profileData.username,
        display_name:
          profileData.display_name ??
          profileData.displayName,
        avatar_url:
          profileData.avatar_url ??
          profileData.avatarUrl,
        banner_url:
          profileData.banner_url ??
          profileData.bannerUrl,
        bio: profileData.bio,
        website: profileData.website,
        favorite_anime:
          profileData.favorite_anime ??
          profileData.favoriteAnime,
      };

      const updates = Object.fromEntries(
        Object.entries(allowedFields).filter(
          ([, value]) => value !== undefined
        )
      );

      if (Object.keys(updates).length === 0) {
        return this.getProfile(userId);
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from(PROFILE_TABLE)
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error,
        };
      }

      return {
        data: normalizeProfile(data),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error,
      };
    }
  },

  async deleteProfile(userId) {
    try {
      const client = getClient();

      if (!userId) {
        return {
          success: false,
          error: new Error("A user ID is required."),
        };
      }

      const { error } = await client
        .from(PROFILE_TABLE)
        .delete()
        .eq("id", userId);

      if (error) {
        return {
          success: false,
          error,
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  },
};

export { normalizeProfile };
export default profileService;
