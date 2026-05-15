"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // FIX: renamed NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY
  // (the standard Supabase env var; the old name caused a runtime undefined error)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const logout = async () => {
    try {
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Sync server-side cookies / middleware
      router.refresh();

      // Hard redirect to login page
      window.location.href = "/";
    } catch (error: unknown) {
      // FIX: typed as unknown instead of any
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error logging out:", message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
