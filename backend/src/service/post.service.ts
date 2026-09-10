import {
  createPostInDb,
  updatePostInDb,
  deletePostFromDb,
  getPostById,
  getPosts,
  togglePostReaction,
  GetPostsOptions
} from "../repo/post.repo.js";

// Helper function to extract hashtags from markdown content
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((tag) => tag.replace(/^#/, "").toLowerCase())));
}

// Helper to extract embedded media URLs from markdown text
export function extractMediaUrls(text: string): string[] {
  const matches = text.match(/!\[.*?\]\(((\/uploads\/[^\s\)]+)|(https?:\/\/[^\s\)]+))\)/g);
  if (!matches) return [];
  const urls: string[] = [];
  for (const m of matches) {
    const urlMatch = m.match(/\((.*?)\)/);
    if (urlMatch && urlMatch[1]) {
      urls.push(urlMatch[1]);
    }
  }
  return Array.from(new Set(urls));
}

export async function appendPost(
  text: string,
  caller?: { uid: string; roles: string } | null,
  tags: string[] = []
) {
  if (!caller || caller.roles !== "ADMIN") {
    throw new Error("Forbidden: Only admin users can create posts");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Post content cannot be empty");
  }

  const extractedTags = extractHashtags(text);
  const combinedTags = Array.from(new Set([...tags, ...extractedTags]));
  const mediaUrls = extractMediaUrls(text);

  const post = await createPostInDb({
    text,
    authorId: caller.uid,
    tags: combinedTags,
    mediaUrls
  });

  return post;
}

export async function updatePost(
  uid: string,
  text: string,
  caller?: { uid: string; roles: string } | null,
  tags: string[] = []
) {
  if (!caller || caller.roles !== "ADMIN") {
    throw new Error("Forbidden: Only admin users can edit posts");
  }

  const existing = await getPostById(uid);
  if (!existing) {
    throw new Error("Post not found");
  }

  const extractedTags = extractHashtags(text);
  const combinedTags = Array.from(new Set([...tags, ...extractedTags]));

  const updated = await updatePostInDb(uid, {
    text,
    tags: combinedTags
  });

  return updated;
}

export async function deletePost(uid: string, caller?: { uid: string; roles: string } | null) {
  if (!caller || caller.roles !== "ADMIN") {
    throw new Error("Forbidden: Only admin users can delete posts");
  }

  const existing = await getPostById(uid);
  if (!existing) {
    throw new Error("Post not found");
  }

  await deletePostFromDb(uid);
  return { success: true, uid };
}

export async function searchPost(options: GetPostsOptions = {}) {
  return getPosts(options);
}

export async function accessPost(uid: string, userid = undefined) {
  // for personal RL STATE UPDATE.
  const post = await getPostById(uid);
  if (!post) {
    throw new Error("Post not found");
  }
  return post;
}

export async function reactToPost(postId: string, userId: string, type = "LIKE") {
  return togglePostReaction(postId, userId, type);
}
