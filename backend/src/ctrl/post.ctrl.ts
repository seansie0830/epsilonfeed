import { Request, Response } from "express";
import {
  appendPost,
  updatePost,
  deletePost,
  accessPost,
  searchPost,
  reactToPost
} from "../service/post.service.js";
import { AuthenticatedRequest } from "../mid/jwt.js";
import { prisma } from "../db.js";

export async function handleCreatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { text, tags } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Post text is required" });
      return;
    }

    const post = await appendPost(text.trim(), req.user, tags);
    res.status(201).json({ success: true, post });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create post" });
  }
}

export async function handleUpdatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { text, tags } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Post text is required" });
      return;
    }

    const post = await updatePost(id, text.trim(), req.user, tags);
    res.json({ success: true, post });
  } catch (err: any) {
    const status = err.message.startsWith("Forbidden") ? 403 : 400;
    res.status(status).json({ error: err.message || "Failed to update post" });
  }
}

export async function handleDeletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await deletePost(id, req.user);
    res.json(result);
  } catch (err: any) {
    const status = err.message.startsWith("Forbidden") ? 403 : 400;
    res.status(status).json({ error: err.message || "Failed to delete post" });
  }
}

export async function handleGetPostById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const post = await accessPost(id);
    res.json({ post });
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Post not found" });
  }
}

export async function handleSearchPosts(req: Request, res: Response): Promise<void> {
  try {
    const { q, tag, authorId, limit, offset } = req.query;
    const result = await searchPost({
      search: q as string,
      tag: tag as string,
      authorId: authorId as string,
      limit: limit ? parseInt(limit as string, 10) : 10,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to search posts" });
  }
}

export async function handleReactToPost(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { type = "LIKE" } = req.body;

    // Use logged in user or a demo user fallback
    let userId = req.user?.uid;
    if (!userId) {
      // Fallback to first user in DB if unauthenticated in dev
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.uid;
    }

    if (!userId) {
      res.status(401).json({ error: "Authentication required to react" });
      return;
    }

    const result = await reactToPost(id, userId, type);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to react to post" });
  }
}

export async function handleGetTrendingTags(_req: Request, res: Response): Promise<void> {
  try {
    const tags = await prisma.tags.findMany({
      take: 12,
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: {
        posts: {
          _count: "desc"
        }
      }
    });

    res.json({
      tags: tags.map((t) => ({
        uid: t.uid,
        text: t.text,
        count: t._count.posts
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch tags" });
  }
}
