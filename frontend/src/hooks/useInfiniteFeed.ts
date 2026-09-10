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
        const filtered = res.posts.filter((p) =>
          p.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setPosts(filtered);
        setHasMore(false);
        filtered.forEach((p) => seenIdsRef.current.add(p.uid));
      } else {
        const res = await api.getFeed({
          limit,
          tag,
          mode,
          exclude: []
        });
        setPosts(res.posts);
        setHasMore(res.posts.length >= limit);
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
        setHasMore(false);
      } else {
        setPosts((prev) => {
          const newPosts = res.posts.filter((p) => !seenIdsRef.current.has(p.uid));
          newPosts.forEach((p) => seenIdsRef.current.add(p.uid));
          return [...prev, ...newPosts];
        });
        if (res.posts.length < limit) {
          setHasMore(false);
        }
      }
    } catch (err: any) {
      console.error("Fetch more posts error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, tag, mode, limit, searchQuery]);

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
