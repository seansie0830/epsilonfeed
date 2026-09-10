(BigInt.prototype as any).toJSON = function () { return this.toString(); };

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authenticateOptional, authenticateAdmin } from "./mid/jwt.js";
import { uploadImageMiddleware } from "./mid/upload.js";

import { handleRegister, handleLogin, handleGetMe, handleGetDemoUsers } from "./ctrl/auth.ctrl.js";
import {
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
  handleGetPostById,
  handleSearchPosts,
  handleReactToPost,
  handleGetTrendingTags
} from "./ctrl/post.ctrl.js";
import { handleGetFeed, handleGetRecommendations, handleSyncReaction } from "./ctrl/feed.ctrl.js";
import { uploadImage } from "./ctrl/upload.ctrl.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, "../uploads");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static normalized uploads
app.use("/uploads", express.static(UPLOAD_DIR));

// API Routes
// 1. Auth routes
app.post("/api/auth/register", handleRegister);
app.post("/api/auth/login", handleLogin);
app.get("/api/auth/me", authenticateOptional, handleGetMe);
app.get("/api/auth/demo-users", handleGetDemoUsers);

// 2. Feed & Recommendation routes
app.get("/api/feed", authenticateOptional, handleGetFeed);
app.get("/api/posts/:id/recommendations", handleGetRecommendations);
app.post("/api/feed/react", authenticateOptional, handleSyncReaction);

// 3. Post CRUD routes
app.get("/api/posts", handleSearchPosts);
app.get("/api/posts/tags/trending", handleGetTrendingTags);
app.get("/api/posts/:id", handleGetPostById);
app.post("/api/posts", authenticateAdmin, handleCreatePost);
app.put("/api/posts/:id", authenticateAdmin, handleUpdatePost);
app.delete("/api/posts/:id", authenticateAdmin, handleDeletePost);
app.post("/api/posts/:id/react", authenticateOptional, handleReactToPost);

// 4. Image upload & normalization route (admin only)
app.post("/api/upload/image", authenticateAdmin, uploadImageMiddleware.single("image") as any, uploadImage);



// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 EpsilonFeed backend running on http://localhost:${port}`);
  console.log(`📁 Static uploads served from ${UPLOAD_DIR}`);
});

