import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Heart,
  Share2,
  Check,
  Tag as TagIcon,
  Sparkles,
  Loader2,
  AlertCircle,
  Type
} from "lucide-react";
import { MarkdownView } from "../components/post/MarkdownView.js";
import { PostEditor } from "../components/post/PostEditor.js";
import { PostRecommendations } from "../components/post/PostRecommendations.js";
import { DisplaySettingsPopover } from "../components/layout/DisplaySettingsPopover.js";
import { Post, User } from "../types/index.js";
import { api } from "../services/api.js";

interface PostDetailPageProps {
  currentUser?: User | null;
}

export const PostDetailPage: React.FC<PostDetailPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [reactionsCount, setReactionsCount] = useState(0);
  const [hasReacted, setHasReacted] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser?.roles === "ADMIN";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsEditing(false);

    api
      .getPost(id)
      .then((res) => {
        setPost(res.post);
        setReactionsCount(res.post._count?.reactions || 0);
        setHasReacted(
          currentUser && res.post.reactions
            ? res.post.reactions.some((r) => r.userId === currentUser.uid)
            : false
        );
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Post not found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, currentUser]);

  const handleToggleReaction = async () => {
    if (!post || isReacting) return;
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!post || !window.confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      await api.deletePost(post.uid);
      navigate("/");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  const formatTime = (isoString: string | Date) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm font-medium">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Post Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">{error || "The requested post could not be loaded."}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
      </div>
    );
  }

  const avatar =
    post.author?.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      post.author?.username || post.uid
    )}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      {/* Back Navigation & Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Feed</span>
        </Link>

        {isAdmin && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Post</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Post Content or In-Webpage Post Editor */}
      {isEditing ? (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-300 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-brand-400" />
              <span>Editing Post in-webpage</span>
            </h3>
          </div>
          <PostEditor
            isInline
            postId={post.uid}
            initialContent={post.text}
            onSave={(updated) => {
              setPost(updated);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <article className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl mb-8">
          {/* Author Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-6">
            <div className="flex items-center gap-3.5">
              <img
                src={avatar}
                alt={post.author?.username || "Author"}
                className="w-12 h-12 rounded-2xl bg-slate-800 object-cover border border-slate-700/80 ring-2 ring-brand-500/20"
              />
              <div>
                <h2 className="text-base font-bold text-white">
                  {post.author?.displayName || post.author?.username || "Community Member"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>@{post.author?.username || "anon"}</span>
                  <span>•</span>
                  <span>{formatTime(post.createAt)}</span>
                </div>
              </div>
            </div>

            {/* Top Share & Reaction Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleReaction}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all active:scale-95 ${
                  hasReacted
                    ? "text-rose-400 bg-rose-950/40 border border-rose-800/40"
                    : "hover:text-rose-400 bg-slate-900 border border-slate-800"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${hasReacted ? "fill-rose-400 scale-110" : ""}`}
                />
                <span className="font-semibold text-xs">{reactionsCount}</span>
              </button>

              {/* Quick Reading Settings */}
              <DisplaySettingsPopover
                customTrigger={(open, toggle) => (
                  <button
                    type="button"
                    onClick={toggle}
                    title="調整閱讀字體與間距"
                    className={`p-2 rounded-xl border text-xs transition-all active:scale-95 ${
                      open
                        ? "bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/20"
                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Type className="w-4 h-4 text-brand-400" />
                  </button>
                )}
              />

              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copy link to post"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Full Markdown Body */}
          <div className="py-2">
            <MarkdownView content={post.text} />
          </div>

          {/* Post Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-4 border-t border-slate-800/80">
              {post.tags.map((tag) => (
                <Link
                  key={tag.uid || tag.text}
                  to={`/?tag=${tag.text}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 hover:bg-brand-900/60 text-slate-300 hover:text-brand-300 border border-slate-700/60 hover:border-brand-500/40 transition-all"
                >
                  <TagIcon className="w-3 h-3 opacity-60" />
                  <span>#{tag.text}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Prominent "You May Also Like" Bottom Recommendation Section */}
      <section className="glass-panel p-6 rounded-3xl border border-slate-800/90 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-white">You May Also Like</h3>
        </div>
        <PostRecommendations
          postId={post.uid}
          onSelectPost={(recId) => {
            navigate(`/post/${recId}`);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </section>
    </div>
  );
};
