import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Tables } from "@/database.types";

export type BasicUserProfile = Pick<
  Tables<"users">,
  "user_id" | "user_name" | "email" | "role" | "account_plan"
>;

const PROFILE_COLUMNS = "user_id, user_name, email, role, account_plan";

function getUserName(user: User) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return metadataName.trim() || user.email?.split("@")[0] || "User";
}

async function fetchUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return supabase
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<BasicUserProfile>();
}

export async function getOrCreateUserProfile(
  supabase: SupabaseClient<Database>,
  user: User,
) {
  const existing = await fetchUserProfile(supabase, user.id);

  if (existing.error || existing.data) {
    return existing;
  }

  const created = await supabase
    .from("users")
    .insert({
      user_id: user.id,
      email: user.email ?? `${user.id}@missing-email.local`,
      user_name: getUserName(user),
    })
    .select(PROFILE_COLUMNS)
    .single<BasicUserProfile>();

  if (!created.error) {
    return created;
  }

  // Another request may have created the profile after our first read.
  if (created.error.code === "23505") {
    return fetchUserProfile(supabase, user.id);
  }

  return created;
}
