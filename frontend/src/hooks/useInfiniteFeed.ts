import { useState, useEffect, useCallback, useRef } from "react";
import { Post } from "../types/index.js";
import { api } from "../services/api.js";

export interface UseInfiniteFeedOptions {
  tag?: string;
  searchQuery?: string;
  mode?: "random" | "latest";
  limit?: number;
  maxAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  backoffFactor?: number;
}

export function useInfiniteFeed({
  tag,
  searchQuery,
  mode = "random",
  limit = 5,
  maxAttempts = 3,
  initialBackoffMs = 1000,
  maxBackoffMs = 10000,
  backoffFactor = 2
}: UseInfiniteFeedOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Track loaded post IDs to prevent duplicates in randomized feed
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialRequestIdRef = useRef(0);
  const moreRequestIdRef = useRef(0);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate unique item instance key to prevent React DOM key collision on recycled/repeated posts
  const attachFeedKey = (p: Post): Post => ({
    ...p,
    feedItemId: `${p.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  });

  // Calculate exponential backoff delay with optional slight jitter
  const getBackoffDelay = (attemptIndex: number): number => {
    const rawDelay = initialBackoffMs * Math.pow(backoffFactor, attemptIndex);
    const cappedDelay = Math.min(rawDelay, maxBackoffMs);
    // Add +/- 10% jitter to avoid thundering herds
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(cappedDelay + jitter));
  };

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      activeTimeoutRef.current = setTimeout(resolve, ms);
    });

  // Load initial batch with max attempt count and exponential backoff
  const fetchInitialPosts = useCallback(async () => {
    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }

    const currentRequestId = ++initialRequestIdRef.current;
    setLoading(true);
    setIsRetrying(false);
    setRetryAttempt(0);
    setError(null);
    seenIdsRef.current.clear();

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (currentRequestId !== initialRequestIdRef.current) {
        return;
      }

      try {
        if (attempt > 1) {
          setIsRetrying(true);
          setRetryAttempt(attempt);
        }

        if (searchQuery && searchQuery.trim().length > 0) {
          // Keyword search mode
          const res = await api.getFeed({
            tag,
            mode: "latest",
            limit: 20
          });

          if (currentRequestId !== initialRequestIdRef.current) return;

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

          if (currentRequestId !== initialRequestIdRef.current) return;

          const postsWithKeys = res.posts.map(attachFeedKey);
          setPosts(postsWithKeys);
          setHasMore(res.posts.length > 0);
          res.posts.forEach((p) => seenIdsRef.current.add(p.uid));
        }

        // Success - clear error and retry status
        setError(null);
        setIsRetrying(false);
        setRetryAttempt(0);
        lastError = null;
        break;
      } catch (err: any) {
        if (currentRequestId !== initialRequestIdRef.current) return;

        lastError = err;
        console.error(`Feed loading error (attempt ${attempt}/${maxAttempts}):`, err);

        if (attempt < maxAttempts) {
          setIsRetrying(true);
          setRetryAttempt(attempt + 1);
          const delay = getBackoffDelay(attempt - 1);
          await wait(delay);
        }
      }
    }

    if (currentRequestId === initialRequestIdRef.current) {
      if (lastError) {
        setError(lastError.message || `Failed to load posts after ${maxAttempts} attempts`);
      }
      setLoading(false);
      setIsRetrying(false);
    }
  }, [tag, searchQuery, mode, limit, maxAttempts, initialBackoffMs, maxBackoffMs, backoffFactor]);

  // Load next batch on scroll with exponential backoff retry
  const fetchMorePosts = useCallback(async () => {
    if (loading || loadingMore || !hasMore || (searchQuery && searchQuery.trim().length > 0)) {
      return;
    }

    const currentRequestId = ++moreRequestIdRef.current;
    setLoadingMore(true);

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (currentRequestId !== moreRequestIdRef.current) return;

      try {
        const res = await api.getFeed({
          limit,
          tag,
          mode,
          exclude: Array.from(seenIdsRef.current)
        });

        if (currentRequestId !== moreRequestIdRef.current) return;

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

        lastError = null;
        break;
      } catch (err: any) {
        if (currentRequestId !== moreRequestIdRef.current) return;

        lastError = err;
        console.error(`Fetch more posts error (attempt ${attempt}/${maxAttempts}):`, err);

        if (attempt < maxAttempts) {
          const delay = getBackoffDelay(attempt - 1);
          await wait(delay);
        }
      }
    }

    if (currentRequestId === moreRequestIdRef.current) {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, tag, mode, limit, searchQuery, posts.length, maxAttempts, initialBackoffMs, maxBackoffMs, backoffFactor]);

  useEffect(() => {
    fetchInitialPosts();

    return () => {
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
      }
    };
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
    retryAttempt,
    maxAttempts,
    isRetrying,
    fetchMorePosts,
    refreshFeed: fetchInitialPosts,
    addPostOptimistic,
    updatePostOptimistic,
    deletePostOptimistic
  };
}
