"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = getSupabaseBrowserClient();

  const logout = async () => {
    try {
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Force full reload so server session is re-evaluated
      window.location.href = "/";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error logging out:", message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
