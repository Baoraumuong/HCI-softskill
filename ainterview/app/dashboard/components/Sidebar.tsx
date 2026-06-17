"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/app/hooks/useLogout";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import type { Tables } from "@/database.types"; 
import { BrandMark } from "@/components/BrandMark";
import { BadgeDollarSign, MonitorPlay, History, LogOut, Loader2, Info, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/configuration", label: "Setup Interview", icon: MonitorPlay },
  { href: "/dashboard/history", label: "Past Interviews", icon: History },
  { href: "/dashboard/about", label: "About", icon: Info },
] as const;

type UserProfile = Tables<"users">;

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();

  /* ─── Dynamic User State ───────────────────────────────── */
  const [user, setUser] = useState({
    name: "Loading...",
    role: "user",
    accountPlan: "normal",
  });
  const [isRequestingPlus, setIsRequestingPlus] = useState(false);
  const [plusRequestStatus, setPlusRequestStatus] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("users")
        .select("user_name, role, account_plan")
        .eq("user_id", userId)
        .single<Pick<UserProfile, "user_name" | "role" | "account_plan">>();

      if (error) {
        console.error("Failed to fetch user profile:", error.message);
        return;
      }

      if (!data) return;

      setUser({
        name: data.user_name || "User",
        role: data.role || "user",
        accountPlan: data.account_plan || "normal",
      });
    };

    // Initial fetch to get current user session
    const checkInitialSession = async () => {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      // Ignore "Auth session missing!" because it only means the user is logged out
      if (error && error.message !== "Auth session missing!") {
        console.error("Supabase auth error:", error.message);
      }

      if (authUser) {
        await fetchUserProfile(authUser.id);
      }
    };

    checkInitialSession();

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        // Reset state when logged out
        setUser({
          name: "Loading...",
          role: "user",
          accountPlan: "normal",
        });
      }
    });

    // Cleanup listener when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Safely get the first letter for the avatar circle
  const getInitial = (name: string) =>
    name && name !== "Loading..."
      ? name.charAt(0).toUpperCase()
      : "?";

  const canRequestPlus = user.role !== "admin" && user.accountPlan !== "plus";

  const requestAccountPlus = async () => {
    setIsRequestingPlus(true);
    setPlusRequestStatus("");

    try {
      const res = await fetch("/api/account/upgrade-request", { method: "POST" });
      const data = await res.json();
      setPlusRequestStatus(data.message ?? (res.ok ? "Request sent." : "Could not send request."));
    } catch {
      setPlusRequestStatus("Could not send request. Please try again.");
    } finally {
      setIsRequestingPlus(false);
    }
  };

  return (
    <aside className="w-[220px] min-w-[220px] h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col font-sans shrink-0 z-10">
      {/* ── Brand / Logo ── */}
      <div className="flex items-center gap-2.5 py-5 px-4 border-b border-gray-100">
        <BrandMark />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 px-2 mb-2">
          Menu
        </p>

        {[...NAV_ITEMS, ...(user.role === "admin" ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }] : [])].map(({ href, label, icon: Icon }) => {
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
              <span
                className={`flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? "text-gray-900"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
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

        {canRequestPlus && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={requestAccountPlus}
              disabled={isRequestingPlus}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex shrink-0 items-center justify-center text-gray-500">
                {isRequestingPlus ? (
                  <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                ) : (
                  <BadgeDollarSign size={16} strokeWidth={2} />
                )}
              </span>
              <span className="min-w-0 flex-1">Request Account Plus</span>
            </button>
            {plusRequestStatus && (
              <p className="mt-2 px-2 text-[11px] leading-relaxed text-gray-500" role="status" aria-live="polite">
                {plusRequestStatus}
              </p>
            )}
          </div>
        )}
      </nav>

      {/* ── Footer / User Profile ── */}
      <div className="p-3.5 border-t border-gray-100 flex items-center gap-2.5">
        {/* User Info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
            {getInitial(user.name)}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold text-gray-900 truncate"
              title={user.name}
            >
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
            <LogOut
              size={14}
              strokeWidth={2}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          )}
        </button>
      </div>
    </aside>
  );
}
