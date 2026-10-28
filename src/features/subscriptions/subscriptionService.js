import { supabase } from "../../lib/supabase";

const SUBSCRIPTIONS_TABLE = "creator_subscriptions";

/**
 * Get the currently signed-in user.
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data.user) {
    throw new Error("Please sign in to manage subscriptions.");
  }

  return data.user;
}

/**
 * Subscribe the current user to a creator.
 */
export async function subscribeToCreator(creatorId) {
  if (!creatorId) {
    throw new Error("A creator ID is required.");
  }

  const user = await getCurrentUser();

  if (user.id === creatorId) {
    throw new Error("You cannot subscribe to yourself.");
  }

  const { error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .upsert(
      {
        subscriber_id: user.id,
        creator_id: creatorId,
      },
      {
        onConflict: "subscriber_id,creator_id",
        ignoreDuplicates: true,
      }
    );

  if (error) throw error;

  return { subscribed: true, creatorId };
}

/**
 * Unsubscribe the current user from a creator.
 */
export async function unsubscribeFromCreator(creatorId) {
  if (!creatorId) {
    throw new Error("A creator ID is required.");
  }

  const user = await getCurrentUser();

  const { error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .delete()
    .eq("subscriber_id", user.id)
    .eq("creator_id", creatorId);

  if (error) throw error;

  return { subscribed: false, creatorId };
}

/**
 * Check whether the current user follows a creator.
 */
export async function isSubscribedToCreator(creatorId) {
  if (!creatorId) return false;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return false;

  const { data, error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .select("creator_id")
    .eq("subscriber_id", user.id)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) throw error;

  return Boolean(data);
}

/**
 * Get the number of subscribers a creator has.
 */
export async function getSubscriberCount(creatorId) {
  if (!creatorId) return 0;

  const { count, error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .select("subscriber_id", {
      count: "exact",
      head: true,
    })
    .eq("creator_id", creatorId);

  if (error) throw error;

  return count ?? 0;
}

/**
 * Get the creators followed by the current user.
 */
export async function getMySubscriptions() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from(SUBSCRIPTIONS_TABLE)
    .select("creator_id, created_at")
    .eq("subscriber_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

const subscriptionService = {
  subscribeToCreator,
  unsubscribeFromCreator,
  isSubscribedToCreator,
  getSubscriberCount,
  getMySubscriptions,
};

export default subscriptionService;