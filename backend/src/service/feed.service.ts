import { getRandomPostsSample, getPostRecommendations, getPosts } from "../repo/post.repo.js";
import { getUserStrategyJson } from "../repo/user.repo.js";
import { prisma } from "../db.js";
import { UserReact, FeedOptions } from "@epsilonfeed/shared";
import feedPolicy from "./feedPolicy/index.js";
export type { UserReact, FeedOptions };

/**
 * Serves non-deterministic / randomized feed posts for infinite scrolling
 */
export async function getFeedByUser(uid?: string, options: FeedOptions = {}) {
  const strategyConfig = uid ? await getUserStrategyJson(uid) : null;
  const rawStrategy = strategyConfig?.strategy;
  const params = strategyConfig?.params;

  // 1. 如果 rawStrategy 存在且在 table 內，就取該 handler，否則 fallback 回 default
  const strategy = (rawStrategy && feedPolicy[rawStrategy] ? feedPolicy[rawStrategy] : undefined) ?? feedPolicy.default;

  // 2. 雙重保險：如果連 feedPolicy.default 都沒配，直接拋明確錯誤避免 TypeError
  if (!strategy) {
    throw new Error('Default feed strategy is not configured.');
  }

  return strategy(uid, params, options);
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
