import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar.js";
import { PostPreviewCard } from "../components/post/PostPreviewCard.js";
import { PostEditor } from "../components/post/PostEditor.js";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed.js";
import { User, Post } from "../types/index.js";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Hash,
  AlertCircle,
  Inbox,
  ShieldCheck,
  Lock
} from "lucide-react";

interface FeedPageProps {
  currentUser?: User | null;
  searchQuery: string;
  onOpenAuthModal: () => void;
  onUserSwitch: (user: User) => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  currentUser,
  searchQuery,
  onOpenAuthModal,
  onUserSwitch
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFromUrl = searchParams.get("tag") || undefined;

  const [activeTag, setActiveTag] = useState<string | undefined>(tagFromUrl);
  const [feedMode, setFeedMode] = useState<"random" | "latest">("random");
  const [showTopCreator, setShowTopCreator] = useState(true);

  useEffect(() => {
    setActiveTag(tagFromUrl);
  }, [tagFromUrl]);

  const handleTagSelect = (tag: string | undefined) => {
    setActiveTag(tag);
    if (tag) {
      setSearchParams({ tag });
    } else {
      setSearchParams({});
    }
  };

  const isAdmin = currentUser?.roles === "ADMIN";

  // Feed hook
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    retryAttempt,
    maxAttempts,
    isRetrying,
    fetchMorePosts,
    refreshFeed,
    addPostOptimistic,
    deletePostOptimistic
  } = useInfiniteFeed({
    tag: activeTag,
    searchQuery,
    mode: feedMode,
    limit: 6,
    maxAttempts: 3,
    initialBackoffMs: 1000,
    maxBackoffMs: 8000,
    backoffFactor: 2
  });

  // IntersectionObserver for Infinite Scroll Sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchMorePosts();
        }
      },
      { rootMargin: "300px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, loading, loadingMore, fetchMorePosts]);

  const handleCreatedPost = (newPost: Post) => {
    addPostOptimistic(newPost);
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Feed Column */}
        <div className="flex-1 w-full min-w-0">
          {/* Admin Post Creator or Guest/User Banner */}
          {isAdmin ? (
            showTopCreator && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Markdown Post Creator</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Creates independent post with automated WebP normalization
                  </span>
                </div>
                <PostEditor
                  onSave={handleCreatedPost}
                  placeholder="Publish markdown content, paste screenshots, or drag images..."
                />
              </div>
            )
          ) : (
            <div className="mb-6 p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Read-Only Feed Stream
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Only administrators can append and manage posts. Feel free to browse, search, and react!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex-shrink-0"
              >
                Sign In as Admin
              </button>
            </div>
          )}

          {/* Active Filters / Feed Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {activeTag ? (
                  <>
                    <Hash className="w-4 h-4 text-brand-400" />
                    <span>Posts tagged with #{activeTag}</span>
                  </>
                ) : searchQuery ? (
                  <span>Search results for "{searchQuery}"</span>
                ) : feedMode === "random" ? (
                  <>
                    <Sparkles className="w-4 h-4 text-brand-400" />
                    <span>Discover Stream (Non-Deterministic)</span>
                  </>
                ) : (
                  <span>Latest Timeline Stream</span>
                )}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => refreshFeed()}
              disabled={loading}
              title="Refresh feed"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-slate-800/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-brand-400" : ""}`} />
            </button>
          </div>

          {/* Retry in progress banner with exponential backoff status */}
          {isRetrying && (
            <div className="p-4 my-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-sm flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Reconnecting to feed stream...</p>
                <p className="text-xs text-amber-400/90">
                  Attempt {retryAttempt} of {maxAttempts} — Retrying with exponential backoff
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isRetrying && (
            <div className="p-4 my-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <div className="flex-1">
                <p className="font-semibold">Failed to load feed</p>
                <p className="text-xs text-rose-400/90">{error} (Exceeded {maxAttempts} attempts)</p>
              </div>
              <button
                onClick={() => refreshFeed()}
                className="px-3 py-1 bg-rose-800/40 hover:bg-rose-700/60 rounded-xl text-xs font-semibold"
              >
                Retry Now
              </button>
            </div>
          )}

          {/* Feed Stream of Prefix Preview Cards */}
          {loading && posts.length === 0 ? (
            <div className="space-y-4 my-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 rounded-2xl animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="w-32 h-3.5 rounded bg-slate-800" />
                      <div className="w-20 h-2.5 rounded bg-slate-800/70" />
                    </div>
                  </div>
                  <div className="w-full h-16 rounded bg-slate-800/50" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 px-4 glass-panel rounded-2xl my-4">
              <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300 mb-1">No posts found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {activeTag
                  ? `No posts found with tag #${activeTag}. Try selecting another tag or clearing the filter.`
                  : "No posts currently available in this feed stream."}
              </p>
              {activeTag && (
                <button
                  type="button"
                  onClick={() => handleTagSelect(undefined)}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostPreviewCard
                  key={post.feedItemId || post.uid}
                  post={post}
                  currentUser={currentUser}
                  onDelete={deletePostOptimistic}
                  onTagClick={(tag) => handleTagSelect(tag)}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs text-brand-400 font-medium py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more posts...</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-4 text-xs text-slate-500">
                <span>🎉 You've reached the end of the stream</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <Sidebar
          activeMode={feedMode}
          onModeChange={(mode) => setFeedMode(mode)}
          activeTag={activeTag}
          onTagSelect={handleTagSelect}
          currentUser={currentUser}
          onUserSwitch={onUserSwitch}
        />
      </div>
    </div>
  );
};
