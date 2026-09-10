import { Request, Response } from "express";
import { getFeedByUser, getRecommendationsForPost, syncReact } from "../service/feed.service.js";
import { AuthenticatedRequest } from "../mid/jwt.js";

export async function handleGetFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { limit, exclude, tag, mode } = req.query;
    const excludeIds = exclude ? (exclude as string).split(",").filter(Boolean) : [];

    const posts = await getFeedByUser(req.user?.uid, {
      limit: limit ? parseInt(limit as string, 10) : 10,
      excludeIds,
      tag: tag as string,
      mode: (mode as any) || "random"
    });

    res.json({
      posts,
      hasMore: posts.length > 0,
      count: posts.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch feed" });
  }
}

export async function handleGetRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const recommendations = await getRecommendationsForPost(
      id,
      limit ? parseInt(limit as string, 10) : 3
    );

    res.json({ recommendations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get recommendations" });
  }
}

export async function handleSyncReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { postId, type = "LIKE", weight } = req.body;
    if (!postId) {
      res.status(400).json({ error: "postId is required" });
      return;
    }

    const userId = req.user?.uid || "anonymous_user";
    const result = await syncReact({
      userId,
      postId,
      type,
      weight
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to sync reaction" });
  }
}
