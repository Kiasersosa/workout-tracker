"use client";

import { useSession, signOut } from "next-auth/react";
import { Settings, LogOut, User, Cloud } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      {/* Account */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-400">Account</h2>
        </div>
        {session?.user ? (
          <>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="rounded-full bg-indigo-500/10 p-2">
                <User size={20} className="text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-3">
              <Cloud size={16} className="text-green-400" />
              <span className="flex-1 text-sm text-slate-400">Google Sheets sync</span>
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </>
        ) : (
          <div className="px-4 py-4 text-sm text-slate-500">Not signed in</div>
        )}
      </div>

      {/* Actions */}
      {session && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-red-400 transition-colors hover:bg-slate-800"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      )}
    </div>
  );
}
