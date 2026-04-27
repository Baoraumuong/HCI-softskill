// components/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User, BarChart3, Info, Code, Menu, X } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  isAction?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Configure", href: "/configure", icon: Code },
  { label: "About Us", href: "/about", icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    console.log("Logging out...");
    // Add your logout logic here
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-blue-600">InterviewAI</h1>
            <p className="text-sm text-slate-500 mt-1">Prepare with confidence</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto" size={16} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  John Doe
                </p>
                <p className="text-xs text-slate-500 truncate">
                  john@example.com
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Import ChevronRight
import { ChevronRight } from "lucide-react";