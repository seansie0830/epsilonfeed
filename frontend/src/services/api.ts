import axios from "axios";
import { FeedResponse, Post, Tag, User, Media } from "../types/index.js";

const client = axios.create({
  baseURL: "/api",
  timeout: 15000
});

// Attach JWT token from localStorage if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("epsilon_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Feed API
  async getFeed(params: {
    limit?: number;
    exclude?: string[];
    tag?: string;
    mode?: "random" | "latest";
  }): Promise<FeedResponse> {
    const res = await client.get<FeedResponse>("/feed", {
      params: {
        limit: params.limit || 6,
        exclude: params.exclude?.join(","),
        tag: params.tag,
        mode: params.mode || "random"
      }
    });
    return res.data;
  },

  // Post API
  async getPost(id: string): Promise<{ post: Post }> {
    const res = await client.get<{ post: Post }>(`/posts/${id}`);
    return res.data;
  },

  async createPost(data: { text: string; tags?: string[] }): Promise<{ success: boolean; post: Post }> {
    const res = await client.post<{ success: boolean; post: Post }>("/posts", data);
    return res.data;
  },

  async updatePost(id: string, data: { text: string; tags?: string[] }): Promise<{ success: boolean; post: Post }> {
    const res = await client.put<{ success: boolean; post: Post }>(`/posts/${id}`, data);
    return res.data;
  },

  async deletePost(id: string): Promise<{ success: boolean; uid: string }> {
    const res = await client.delete<{ success: boolean; uid: string }>(`/posts/${id}`);
    return res.data;
  },

  async toggleReaction(postId: string, type = "LIKE"): Promise<{ reacted: boolean; type: string }> {
    const res = await client.post<{ reacted: boolean; type: string }>(`/posts/${postId}/react`, { type });
    return res.data;
  },

  async getRecommendations(postId: string, limit = 3): Promise<{ recommendations: Post[] }> {
    const res = await client.get<{ recommendations: Post[] }>(`/posts/${postId}/recommendations`, {
      params: { limit }
    });
    return res.data;
  },

  async getTrendingTags(): Promise<{ tags: Tag[] }> {
    const res = await client.get<{ tags: Tag[] }>("/posts/tags/trending");
    return res.data;
  },

  // Image Upload with Normalization
  async uploadImage(file: File): Promise<{ success: boolean; media: Media & { markdown: string } }> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await client.post<{ success: boolean; media: Media & { markdown: string } }>(
      "/upload/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );
    return res.data;
  },

  // Auth API
  async getDemoUsers(): Promise<{ users: User[] }> {
    const res = await client.get<{ users: User[] }>("/auth/demo-users");
    return res.data;
  },

  async register(username: string, password: string, displayName?: string): Promise<{ user: User; token: string }> {
    const res = await client.post<{ user: User; token: string }>("/auth/register", {
      username,
      password,
      displayName
    });
    if (res.data.token) {
      localStorage.setItem("epsilon_token", res.data.token);
      localStorage.setItem("epsilon_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(username: string, password = "password123"): Promise<{ user: User; token: string }> {
    const res = await client.post<{ user: User; token: string }>("/auth/login", {
      username,
      password
    });
    if (res.data.token) {
      localStorage.setItem("epsilon_token", res.data.token);
      localStorage.setItem("epsilon_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe(): Promise<{ user: User } | null> {
    try {
      const res = await client.get<{ user: User }>("/auth/me");
      return res.data;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem("epsilon_token");
    localStorage.removeItem("epsilon_user");
  }
};
