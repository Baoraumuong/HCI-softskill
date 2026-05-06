"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/hooks/useLogout";
import { getSupabaseBrowserClient } from "../app/lib/supabase/browser-client"; 
import { MonitorPlay, History, TrendingUp, Settings, LogOut, Loader2, Hexagon } from "lucide-react";

/* ─── Navigation Data ────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/configuration", label: "Setup Interview", icon: MonitorPlay },
  { href: "/history", label: "Past Interviews", icon: History },
  { href: "/progress", label: "My Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();
  
  /* ─── Dynamic User State ───────────────────────────────── */
  const [user, setUser] = useState({
    name: "Loading...",
    email: ""
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Helper function to process and set the user data
    const processUser = (sessionUser: any) => {
      if (!sessionUser) {
        setUser({ name: "Guest User", email: ""});
        return;
      }

      // Grab name from metadata (Google/GitHub) or fallback to email prefix
      const fullName = sessionUser.user_metadata?.full_name 
        || sessionUser.user_metadata?.name 
        || sessionUser.email?.split('@')[0] 
        || "User";

      setUser({ 
        name: fullName, 
        email: sessionUser.email || ""
      });
    };

    // Initial fetch to get current user session
    const checkInitialSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Ignore the specific "Auth session missing!" error as it just means they are logged out
      if (error && error.message !== "Auth session missing!") {
        console.error("Supabase auth error:", error.message);
      }
      
      processUser(user);
    };

    checkInitialSession();

    // Set up a listener for real-time auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        processUser(session?.user);
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to grab the first letter for the avatar circle safely
  const getInitial = (name: string) => name && name !== "Loading..." ? name.charAt(0).toUpperCase() : "?";

  return (
    <aside className="w-[220px] min-w-[220px] h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col font-sans shrink-0 z-10">
      
      {/* ── Brand / Logo ── */}
      <div className="flex items-center gap-2.5 py-5 px-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Hexagon size={18} strokeWidth={2.5} className="fill-gray-900" />
        </div>
        <span className="text-[14.5px] font-semibold text-gray-900 tracking-tight">
          PrepAI
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 px-2 mb-2">
          Menu
        </p>
        
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link 
              key={href} 
              href={href} 
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative ${
                active 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`flex items-center justify-center shrink-0 transition-colors ${active ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"}`}>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="flex-1">{label}</span>
              
              {/* Active Indicator Dot */}
              {active && (
                <span className="w-1.5 h-1.5 bg-gray-900 rounded-full shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer / User Profile ── */}
      <div className="p-3.5 border-t border-gray-100 flex items-center gap-2.5">
        
        {/* User Info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
            {getInitial(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate" title={user.name}>
              {user.name}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          disabled={isLoggingOut}
          aria-label="Log out"
          title="Log out"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoggingOut ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>

      </div>
    </aside>
  );
}