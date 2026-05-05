"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      
      // 1. Sign out from Supabase (this clears local storage & attempts to hit the auth endpoint)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Refresh the current route to sync server state/cookies
      router.refresh();
      
      // 3. Use window.location for a "hard" reset to the login page
      window.location.href = "/"; 
    } catch (error: any) {
      console.error("Error logging out:", error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}