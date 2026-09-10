import { useState, useEffect, useCallback, useRef } from "react";
import { Post } from "../types/index.js";
import { api } from "../services/api.js";

interface UseInfiniteFeedOptions {
  tag?: string;
  searchQuery?: string;
  mode?: "random" | "latest";
  limit?: number;
}

export function useInfiniteFeed({
  tag,
  searchQuery,
  mode = "random",
  limit = 5
}: UseInfiniteFeedOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track loaded post IDs to prevent duplicates in randomized feed
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Generate unique item instance key to prevent React DOM key collision on recycled/repeated posts
  const attachFeedKey = (p: Post): Post => ({
    ...p,
    feedItemId: `${p.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  });

  // Load initial batch
  const fetchInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    seenIdsRef.current.clear();

    try {
      if (searchQuery && searchQuery.trim().length > 0) {
        // Keyword search mode
        const res = await api.getFeed({
          tag,
          mode: "latest",
          limit: 20
        });
        const filtered = res.posts
          .filter((p) => p.text.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(attachFeedKey);
        setPosts(filtered);
        setHasMore(false);
      } else {
        const res = await api.getFeed({
          limit,
          tag,
          mode,
          exclude: []
        });
        const postsWithKeys = res.posts.map(attachFeedKey);
        setPosts(postsWithKeys);
        setHasMore(res.posts.length > 0);
        res.posts.forEach((p) => seenIdsRef.current.add(p.uid));
      }
    } catch (err: any) {
      console.error("Feed loading error:", err);
      setError(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [tag, searchQuery, mode, limit]);

  // Load next batch on scroll
  const fetchMorePosts = useCallback(async () => {
    if (loading || loadingMore || !hasMore || (searchQuery && searchQuery.trim().length > 0)) {
      return;
    }

    setLoadingMore(true);
    try {
      const res = await api.getFeed({
        limit,
        tag,
        mode,
        exclude: Array.from(seenIdsRef.current)
      });

      if (res.posts.length === 0) {
        // In dev / random mode, if empty, reset seen IDs and allow continuous repeating
        if (mode === "random" && posts.length > 0) {
          seenIdsRef.current.clear();
        } else {
          setHasMore(false);
        }
      } else {
        const newPostsWithKeys = res.posts.map(attachFeedKey);
        res.posts.forEach((p) => seenIdsRef.current.add(p.uid));
        setPosts((prev) => [...prev, ...newPostsWithKeys]);
        setHasMore(true);
      }
    } catch (err: any) {
      console.error("Fetch more posts error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, tag, mode, limit, searchQuery, posts.length]);

  useEffect(() => {
    fetchInitialPosts();
  }, [fetchInitialPosts]);

  // Local helper mutations
  const addPostOptimistic = useCallback((newPost: Post) => {
    seenIdsRef.current.add(newPost.uid);
    setPosts((prev) => [newPost, ...prev]);
  }, []);

  const updatePostOptimistic = useCallback((updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.uid === updatedPost.uid ? { ...p, ...updatedPost } : p))
    );
  }, []);

  const deletePostOptimistic = useCallback((postId: string) => {
    seenIdsRef.current.delete(postId);
    setPosts((prev) => prev.filter((p) => p.uid !== postId));
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchMorePosts,
    refreshFeed: fetchInitialPosts,
    addPostOptimistic,
    updatePostOptimistic,
    deletePostOptimistic
  };
}
