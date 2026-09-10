import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../service/user.service.js";
import { User } from "@epsilonfeed/shared";

export interface AuthenticatedRequest extends Request {
  user?: User | null;
}

export async function authenticateOptional(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  const user = await verifyToken(token);
  req.user = user;
  next();
}

export async function authenticateAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Token missing" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const user = await verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }

  if (user.roles !== "ADMIN") {
    res.status(403).json({ error: "Forbidden: Admin privileges required" });
    return;
  }

  req.user = user;
  next();
}

