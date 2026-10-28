
import { supabase } from "../../lib/supabase";

const getClient = () => {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check your .env file."
    );
  }

  return supabase;
};

const normalizeUser = (user) => {
  if (!user) return null;

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email || "",
    name:
      metadata.display_name ||
      metadata.full_name ||
      metadata.username ||
      "",
    username: metadata.username || "",
    avatarUrl:
      metadata.avatar_url ||
      metadata.avatarUrl ||
      metadata.picture ||
      null,
    createdAt: user.created_at || null,
    emailConfirmedAt: user.email_confirmed_at || null,
  };
};

const getErrorMessage = (error) => {
  const message = error?.message || "";

  if (!message) {
    return "Something went wrong. Please try again.";
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (normalizedMessage.includes("password should be at least")) {
    return "Your password is too short.";
  }

  if (normalizedMessage.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("failed to fetch")
  ) {
    return "Network error. Check your internet connection.";
  }

  return message;
};

const throwIfError = (error) => {
  if (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const authService = {
  /**
   * Register a new user.
   */
  async signUp({ email, password, username }) {
    const client = getClient();

    const cleanEmail = email?.trim().toLowerCase();
    const cleanUsername = username?.trim();

    if (!cleanEmail || !password || !cleanUsername) {
      throw new Error(
        "Username, email, and password are required."
      );
    }

    if (password.length < 6) {
      throw new Error(
        "Your password must contain at least 6 characters."
      );
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
        },
      },
    });

    throwIfError(error);

    return {
      user: normalizeUser(data.user),
      session: data.session || null,
      needsEmailConfirmation: !data.session && !!data.user,
      successMessage: data.session
        ? "Your account has been created successfully!"
        : "Your account has been created. Check your email for a confirmation link before signing in.",
    };
  },

  /**
   * Sign in with email and password.
   */
  async signIn({ email, password }) {
    const client = getClient();

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error("Email and password are required.");
    }

    const { data, error } =
      await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    throwIfError(error);

    return {
      user: normalizeUser(data.user),
      session: data.session || null,
    };
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    const client = getClient();

    const { error } = await client.auth.signOut();

    throwIfError(error);

    return { success: true };
  },

  /**
   * Get the current session.
   */
  async getSession() {
    const client = getClient();

    const { data, error } = await client.auth.getSession();

    throwIfError(error);

    return data.session || null;
  },

  /**
   * Get the currently authenticated user.
   */
  async getCurrentUser() {
    const client = getClient();

    const { data, error } = await client.auth.getUser();

    if (error) {
      const message = error.message?.toLowerCase() || "";

      if (
        message.includes("session") ||
        message.includes("auth session missing")
      ) {
        return null;
      }

      throw new Error(getErrorMessage(error));
    }

    return normalizeUser(data.user);
  },

  /**
   * Send a password reset email.
   */
  async resetPassword(email) {
    const client = getClient();

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error("Please enter your email address.");
    }

    const redirectTo =
      `${window.location.origin}/update-password`;

    const { error } =
      await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

    throwIfError(error);

    return {
      success: true,
      message:
        "If an account exists for that email, password reset instructions will be sent.",
    };
  },

  /**
   * Update the password for the current authenticated user.
   */
  async updatePassword(password) {
    const client = getClient();

    if (!password || password.length < 6) {
      throw new Error(
        "Your new password must contain at least 6 characters."
      );
    }

    const { data, error } = await client.auth.updateUser({
      password,
    });

    throwIfError(error);

    return {
      user: normalizeUser(data.user),
      success: true,
      message: "Your password has been updated successfully.",
    };
  },

  /**
   * Subscribe to authentication changes.
   * Returns the subscription so the caller can unsubscribe.
   */
  onAuthStateChange(callback) {
    const client = getClient();

    if (typeof callback !== "function") {
      throw new Error(
        "onAuthStateChange requires a callback function."
      );
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      try {
        callback({
          event,
          session: session || null,
          user: normalizeUser(session?.user || null),
        });
      } catch (error) {
        console.error(
          "Error handling authentication state change:",
          error
        );
      }
    });

    return subscription;
  },
};

export default authService;
