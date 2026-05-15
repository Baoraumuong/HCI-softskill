"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const logout = async () => {
    try {
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Force full reload so server session is re-evaluated
      window.location.href = "/";
    } catch (error: any) {
      console.error("Error logging out:", error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}