import React, { useState } from "react";
import {
  Heart,
  MessageSquare,
  Share2,
  Edit2,
  Trash2,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon
} from "lucide-react";
import { MarkdownView } from "./MarkdownView.js";
import { PostEditor } from "./PostEditor.js";
import { PostRecommendations } from "./PostRecommendations.js";
import { Post, User } from "../../types/index.js";
import { api } from "../../services/api.js";

interface PostCardProps {
  post: Post;
  currentUser?: User | null;
  onUpdate: (updatedPost: Post) => void;
  onDelete: (postId: string) => void;
  onTagClick?: (tag: string) => void;
  onSelectRecommendedPost?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onUpdate,
  onDelete,
  onTagClick,
  onSelectRecommendedPost
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [reactionsCount, setReactionsCount] = useState(post._count?.reactions || 0);
  const [hasReacted, setHasReacted] = useState(
    currentUser && post.reactions
      ? post.reactions.some((r) => r.userId === currentUser.uid)
      : false
  );
  const [isReacting, setIsReacting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showRecs, setShowRecs] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Time format helper
  const formatTime = (isoString: string) => {
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

  const handleToggleReaction = async () => {
    if (isReacting) return;
    setIsReacting(true);

    const prevReacted = hasReacted;
    const prevCount = reactionsCount;

    // Optimistic UI update
    setHasReacted(!prevReacted);
    setReactionsCount(prevReacted ? prevCount - 1 : prevCount + 1);

    try {
      const res = await api.toggleReaction(post.uid, "LIKE");
      setHasReacted(res.reacted);
    } catch (err) {
      console.error("Reaction failed:", err);
      // Revert on error
      setHasReacted(prevReacted);
      setReactionsCount(prevCount);
    } finally {
      setIsReacting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${post.uid}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      await api.deletePost(post.uid);
      onDelete(post.uid);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  const isAdmin = currentUser?.roles === "ADMIN";

  // In-Webpage Edit Mode Active
  if (isEditing) {
    return (
      <div id={`post-${post.uid}`} className="my-4 animate-fade-in">
        <PostEditor
          isInline
          postId={post.uid}
          initialContent={post.text}
          onSave={(updated) => {
            onUpdate(updated);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const avatar =
    post.author?.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      post.author?.username || post.uid
    )}`;

  return (
    <article
      id={`post-${post.uid}`}
      className="group relative my-4 rounded-2xl glass-card border border-slate-800/80 hover:border-slate-700/80 p-5 transition-all shadow-xl"
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

        {/* Action Dropdown / Buttons (Admin Only) */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Edit post (Admin)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-slate-800/80 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                title="Delete post (Admin)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Markdown Content Body */}
      <div className="py-1">
        <MarkdownView content={post.text} />
      </div>

      {/* Tags Chips */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2">
          {post.tags.map((tag) => (
            <button
              key={tag.uid || tag.text}
              type="button"
              onClick={() => onTagClick && onTagClick(tag.text)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-brand-900/60 text-slate-300 hover:text-brand-300 border border-slate-700/50 hover:border-brand-500/40 transition-all"
            >
              <TagIcon className="w-2.5 h-2.5 opacity-60" />
              <span>#{tag.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Card Action Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          {/* Reaction Button */}
          <button
            type="button"
            onClick={handleToggleReaction}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-90 ${
              hasReacted
                ? "text-rose-400 bg-rose-950/40 border border-rose-800/40"
                : "hover:text-rose-400 hover:bg-slate-800/60"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                hasReacted ? "fill-rose-400 scale-110" : ""
              }`}
            />
            <span className="font-semibold text-xs">{reactionsCount}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-brand-300 hover:bg-slate-800/60 transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>

        {/* You May Also Like Toggle */}
        <button
          type="button"
          onClick={() => setShowRecs(!showRecs)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-brand-300 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-brand-400" />
          <span>Recommendations</span>
          {showRecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* "You May Also Like" Bottom Section */}
      {showRecs && (
        <div className="animate-slide-up">
          <PostRecommendations
            postId={post.uid}
            onSelectPost={onSelectRecommendedPost}
          />
        </div>
      )}
    </article>
  );
};
