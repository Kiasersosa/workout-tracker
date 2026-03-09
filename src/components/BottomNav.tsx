"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Brain, TrendingUp, Ruler, Settings } from "lucide-react";
import { haptic } from "@/lib/haptics";

const navItems = [
  { href: "/", label: "Workout", icon: Dumbbell },
  { href: "/trainer", label: "Trainer", icon: Brain },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/body", label: "Body", icon: Ruler },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => haptic("light")}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? "text-indigo-400" : "text-slate-500"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
