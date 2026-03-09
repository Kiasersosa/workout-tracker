"use client";

import { Wifi, WifiOff, RefreshCw, AlertCircle, Cloud } from "lucide-react";
import { useSync } from "@/hooks/useSync";

export default function OfflineBanner() {
  const { status, pendingCount, sync } = useSync();

  // Don't show anything when online with nothing pending
  if (status === "online" && pendingCount === 0) return null;

  const config = {
    online: {
      icon: Cloud,
      bg: "bg-indigo-500/10 border-indigo-500/20",
      text: "text-indigo-400",
      message: `${pendingCount} pending`,
    },
    syncing: {
      icon: RefreshCw,
      bg: "bg-yellow-500/10 border-yellow-500/20",
      text: "text-yellow-400",
      message: `Syncing ${pendingCount} item${pendingCount !== 1 ? "s" : ""}...`,
    },
    offline: {
      icon: WifiOff,
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      message: `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`,
    },
    error: {
      icon: AlertCircle,
      bg: "bg-orange-500/10 border-orange-500/20",
      text: "text-orange-400",
      message: "Sync error",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b px-4 py-2 ${config.bg}`}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={`${config.text} ${status === "syncing" ? "animate-spin" : ""}`}
        />
        <span className={`text-xs font-medium ${config.text}`}>
          {config.message}
        </span>
      </div>
      {(status === "online" || status === "error") && pendingCount > 0 && (
        <button
          onClick={sync}
          className={`text-xs font-medium ${config.text} hover:underline`}
        >
          Sync now
        </button>
      )}
    </div>
  );
}
