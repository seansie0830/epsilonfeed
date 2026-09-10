import { getRandomPostsSample, getPostRecommendations, getPosts } from "../repo/post.repo.js";
import { prisma } from "../db.js";

export interface UserReact {
  userId: string;
  postId: string;
  type: "LIKE" | "DISLIKE" | "HEART" | "BOOKMARK";
  weight?: number;
}

export interface FeedOptions {
  limit?: number;
  excludeIds?: string[];
  tag?: string;
  mode?: "random" | "latest" | "trending";
}

/**
 * Serves non-deterministic / randomized feed posts for infinite scrolling
 */
export async function getFeedByUser(uid?: string | null, options: FeedOptions = {}) {
  const { limit = 10, excludeIds = [], tag, mode = "random" } = options;

  if (tag) {
    const res = await getPosts({ tag, limit, excludeIds });
    return res.posts;
  }

  if (mode === "latest") {
    const res = await getPosts({ limit, excludeIds });
    return res.posts;
  }

  // Non-deterministic random feed sampling
  const sample = await getRandomPostsSample(limit, excludeIds);
  return sample;
}

/**
 * Returns "You May Also Like" post recommendations for the bottom of a post
 */
export async function getRecommendationsForPost(postId: string, limit = 3) {
  return getPostRecommendations(postId, limit);
}

/**
 * Sync user reaction and hook for future vector embedding updates
 */
export async function syncReact(react: UserReact) {
  const { userId, postId, type } = react;

  // Placeholder for vector preference update
  const user = await prisma.user.findUnique({
    where: { uid: userId },
    select: { vec: true, strategy: true }
  });

  // Log or update strategy json
  console.log(`[FeedService] Synced reaction '${type}' for user ${userId} on post ${postId}`);

  return { success: true, userId, postId, type };
}

