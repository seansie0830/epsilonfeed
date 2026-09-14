import React, { useEffect, useState } from "react";
import {
  Shuffle,
  Clock,
  Hash,
  Flame,
  Users,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  Type
} from "lucide-react";
import { Tag, User } from "../../types/index.js";
import { api } from "../../services/api.js";
import { useDisplaySettings, FontSize, LineSpacing } from "../../context/DisplaySettingsContext.js";

interface SidebarProps {
  activeMode: "random" | "latest";
  onModeChange: (mode: "random" | "latest") => void;
  activeTag?: string;
  onTagSelect: (tag: string | undefined) => void;
  currentUser?: User | null;
  onUserSwitch: (user: User) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMode,
  onModeChange,
  activeTag,
  onTagSelect,
  currentUser,
  onUserSwitch
}) => {
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const { settings, setFontSize, setLineSpacing, fontSizeConfig, lineSpacingConfig } =
    useDisplaySettings();

  useEffect(() => {
    async function loadData() {
      try {
        const [tagsRes, usersRes] = await Promise.all([
          api.getTrendingTags(),
          api.getDemoUsers()
        ]);
        setTrendingTags(tagsRes.tags);
        setDemoUsers(usersRes.users);
      } catch (err) {
        console.error("Sidebar data load error:", err);
      }
    }
    loadData();
  }, []);

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-5">
      {/* Feed Stream Modes */}
      <div className="glass-panel p-4 rounded-2xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Feed Algorithm</span>
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onModeChange("random")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === "random"
                ? "bg-brand-600/90 text-white shadow-md shadow-brand-500/20"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-brand-300" />
              <span>Discover (Random Stream)</span>
            </div>
            {activeMode === "random" && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onModeChange("latest")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === "latest"
                ? "bg-brand-600/90 text-white shadow-md shadow-brand-500/20"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-brand-300" />
              <span>Latest Timeline</span>
            </div>
            {activeMode === "latest" && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Trending Tags */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Popular Tags</span>
          </h3>
          {activeTag && (
            <button
              type="button"
              onClick={() => onTagSelect(undefined)}
              className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>Clear</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {activeTag && (
          <div className="mb-3 p-2 bg-brand-950/60 border border-brand-800/60 rounded-xl flex items-center justify-between text-xs text-brand-300">
            <span>Filtering by #{activeTag}</span>
            <button onClick={() => onTagSelect(undefined)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {trendingTags.map((tag) => (
            <button
              key={tag.uid || tag.text}
              type="button"
              onClick={() => onTagSelect(tag.text === activeTag ? undefined : tag.text)}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl transition-all ${
                activeTag === tag.text
                  ? "bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20"
                  : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50"
              }`}
            >
              <Hash className="w-3 h-3 opacity-60" />
              <span>{tag.text}</span>
              {tag.count && tag.count > 0 && (
                <span className="text-[10px] opacity-60 ml-0.5">({tag.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reading & Spacing Preferences Quick Controls */}
      <div className="glass-panel p-4 rounded-2xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
          <span>閱讀與版面偏好</span>
        </h3>

        {/* Font Size Quick Selector */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-400" />
              <span>字體大小</span>
            </span>
            <span className="font-mono text-brand-300">
              {fontSizeConfig[settings.fontSize].px}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(["sm", "md", "lg", "xl"] as FontSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  settings.fontSize === size
                    ? "bg-brand-600 text-white border-brand-500 shadow-sm"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                {fontSizeConfig[size].label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Spacing Quick Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span>行距 / 行高</span>
            <span className="font-mono text-indigo-300">
              {lineSpacingConfig[settings.lineSpacing].desc}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["compact", "normal", "relaxed"] as LineSpacing[]).map((spacing) => (
              <button
                key={spacing}
                type="button"
                onClick={() => setLineSpacing(spacing)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  settings.lineSpacing === spacing
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                {lineSpacingConfig[spacing].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Account Switcher */}
      <div className="glass-panel p-4 rounded-2xl">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Switch Active User</span>
        </h3>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Switch user session to test author permissions, inline editing, and customized reactions.
        </p>
        <div className="space-y-2">
          {demoUsers.map((user) => {
            const isSelected = currentUser?.uid === user.uid;
            return (
              <button
                key={user.uid}
                type="button"
                onClick={() => onUserSwitch(user)}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                  isSelected
                    ? "bg-emerald-950/40 border border-emerald-500/50 text-emerald-300"
                    : "bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 text-left">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-7 h-7 rounded-lg bg-slate-700 object-cover"
                  />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{user.displayName || user.username}</p>
                    <p className="text-[10px] text-slate-500 font-mono">@{user.username} ({user.roles})</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
