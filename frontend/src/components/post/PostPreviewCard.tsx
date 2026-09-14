import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ArrowRight,
  Trash2,
  Tag as TagIcon,
  BookOpen,
  Image as ImageIcon
} from "lucide-react";
import { Post, User } from "../../types/index.js";
import { api } from "../../services/api.js";

interface PostPreviewCardProps {
  post: Post;
  currentUser?: User | null;
  onDelete?: (postId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const PostPreviewCard: React.FC<PostPreviewCardProps> = ({
  post,
  currentUser,
  onDelete,
  onTagClick
}) => {
  const [reactionsCount, setReactionsCount] = useState(post._count?.reactions || 0);
  const [hasReacted, setHasReacted] = useState(
    currentUser && post.reactions
      ? post.reactions.some((r) => r.userId === currentUser.uid)
      : false
  );
  const [isReacting, setIsReacting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser?.roles === "ADMIN";

  // Time format helper
  const formatTime = (isoString: string | Date) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return "just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "recently";
    }
  };

  const handleToggleReaction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isReacting) return;
    setIsReacting(true);

    const prevReacted = hasReacted;
    const prevCount = reactionsCount;

    setHasReacted(!prevReacted);
    setReactionsCount(prevReacted ? prevCount - 1 : prevCount + 1);

    try {
      const res = await api.toggleReaction(post.uid, "LIKE");
      setHasReacted(res.reacted);
    } catch {
      setHasReacted(prevReacted);
      setReactionsCount(prevCount);
    } finally {
      setIsReacting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      await api.deletePost(post.uid);
      if (onDelete) onDelete(post.uid);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  // Extract first heading/title and prefix text
  const lines = post.text.split("\n").map((l) => l.trim()).filter(Boolean);
  let title = "Markdown Note";
  let firstImgUrl: string | null = null;

  // Extract first image in markdown
  const imgMatch = post.text.match(/!\[.*?\]\(((\/uploads\/[^\s\)]+)|(https?:\/\/[^\s\)]+))\)/);
  if (imgMatch && imgMatch[1]) {
    firstImgUrl = imgMatch[1];
  }

  // Find title line
  for (const line of lines) {
    if (line.startsWith("#")) {
      title = line.replace(/^#+\s*/, "").replace(/[#*`_\[\]()]/g, "");
      break;
    }
  }

  // Extract clean prefix summary text (strip markdown code/images)
  const cleanSnippet = post.text
    .replace(/^#+\s.*$/gm, "") // Remove headers
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
    .replace(/```[\s\S]*?```/g, "[Code Snippet]") // Replace code blocks
    .replace(/[#*`_\[\]()]/g, "") // Strip markdown symbols
    .trim()
    .slice(0, 220);

  const avatar =
    post.author?.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      post.author?.username || post.uid
    )}`;

  return (
    <article
      className="group relative rounded-2xl glass-card border border-slate-800/80 hover:border-brand-500/40 transition-all shadow-xl hover:shadow-2xl hover:shadow-brand-500/5"
      style={{ padding: "var(--reading-card-padding, 1.25rem)" }}
    >
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={post.author?.username || "Author"}
            className="w-10 h-10 rounded-xl bg-slate-800 object-cover border border-slate-700/60 ring-2 ring-brand-500/10"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                {post.author?.displayName || post.author?.username || "Community Member"}
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                @{post.author?.username || "anon"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{formatTime(post.createAt)}</span>
              {post.updateAt && post.updateAt !== post.createAt && (
                <span className="text-slate-500 italic">• edited</span>
              )}
            </div>
          </div>
        </div>

        {/* Admin Delete Action */}
        {isAdmin && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            title="Delete post (Admin)"
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Linkable Prefix Body */}
      <Link to={`/post/${post.uid}`} className="block group/link cursor-pointer">
        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-white group-hover/link:text-brand-300 transition-colors line-clamp-2 mb-2 leading-snug"
              style={{ fontSize: "calc(var(--reading-font-size, 16px) * 1.15)" }}
            >
              {title}
            </h3>

            <p
              className="text-slate-300 line-clamp-3 mb-3 transition-all"
              style={{
                fontSize: "calc(var(--reading-font-size, 16px) * 0.9)",
                lineHeight: "var(--reading-line-height, 1.7)"
              }}
            >
              {cleanSnippet ? `${cleanSnippet}...` : "Click to view full post and markdown content."}
            </p>
          </div>

          {/* Optional Normalized Image Thumbnail */}
          {firstImgUrl && (
            <div className="w-full sm:w-28 h-28 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 shadow-inner">
              <img
                src={firstImgUrl}
                alt="Post thumbnail"
                loading="lazy"
                className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </div>
      </Link>

      {/* Tags Filter Chips */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {post.tags.map((tag) => (
            <button
              key={tag.uid || tag.text}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(tag.text);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-brand-900/60 text-slate-300 hover:text-brand-300 border border-slate-700/50 hover:border-brand-500/40 transition-all"
            >
              <TagIcon className="w-2.5 h-2.5 opacity-60" />
              <span>#{tag.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Footer Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {/* Reaction Button */}
          <button
            type="button"
            onClick={handleToggleReaction}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all active:scale-90 ${
              hasReacted
                ? "text-rose-400 bg-rose-950/40 border border-rose-800/40"
                : "hover:text-rose-400 hover:bg-slate-800/60"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform ${
                hasReacted ? "fill-rose-400 scale-110" : ""
              }`}
            />
            <span className="font-semibold text-xs">{reactionsCount}</span>
          </button>
        </div>

        {/* Read Full Post Button */}
        <Link
          to={`/post/${post.uid}`}
          className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 group-hover:translate-x-0.5 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Read Full Post</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
