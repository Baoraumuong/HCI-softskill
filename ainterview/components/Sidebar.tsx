"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";

export default function Sidebar() {
  const { logout, isLoggingOut } = useLogout();

  return (
    <aside className="h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4">
      
      {/* Top section (menu placeholder) */}
      <div>
        {/* Add your nav items here */}
      </div>

      {/* Bottom section (logout) */}
      <button
        onClick={logout}
        disabled={isLoggingOut}
        className={`flex items-center gap-3 px-4 py-3 text-sm text-red-600 rounded-lg transition-colors ${
          isLoggingOut
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-red-50"
        }`}
      >
        <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
      </button>
    </aside>
  );
}