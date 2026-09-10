import { Request, Response } from "express";
import { register, getJWTtoken } from "../service/user.service.js";
import { AuthenticatedRequest } from "../mid/jwt.js";
import { prisma } from "../db.js";

export async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await register(username.trim(), password, displayName?.trim());
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to register" });
  }
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await getJWTtoken(username.trim(), password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Login failed" });
  }
}

export async function handleGetMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
}

export async function handleGetDemoUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        uid: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        roles: true
      }
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch demo users" });
  }
}
