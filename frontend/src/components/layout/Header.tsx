import React from "react";
import { Search, PlusCircle, LogIn, LogOut, Radio, ShieldCheck } from "lucide-react";
import { User } from "../../types/index.js";
import { DisplaySettingsPopover } from "./DisplaySettingsPopover.js";

interface HeaderProps {
  currentUser?: User | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewPost: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  searchQuery,
  onSearchChange,
  onOpenNewPost,
  onOpenAuthModal,
  onLogout
}) => {
  const isAdmin = currentUser?.roles === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-brand-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Radio className="w-5 h-5 text-brand-400 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent tracking-tight">
              Epsilon<span className="text-brand-400">Feed</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/50">
              v1.0
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search posts, markdown notes, tags (#react)..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Controls & Active User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Typography & Spacing Display Settings */}
          <DisplaySettingsPopover />

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenNewPost}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline">New Post</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <img
                src={
                  currentUser.avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                }
                alt={currentUser.username}
                className="w-8 h-8 rounded-lg bg-slate-800 object-cover border border-slate-700"
              />
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser.displayName || currentUser.username}
                  </p>
                  {isAdmin ? (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      USER
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

