export function isSupabaseNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = error.cause;

  return (
    error.message === "fetch failed" ||
    (typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(
        String(cause.code),
      ))
  );
}

export function supabaseUnavailableMessage() {
  return "Cannot connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL, your network/DNS, or whether the Supabase project is active.";
}
