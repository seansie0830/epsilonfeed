export type UserRole = "USER" | "ADMIN" | string;

export interface User {
  uid: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string;
  strategy?: string;
  createdAt?: string | Date;
}

export interface UserPublic {
  uid: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string;
  createdAt?: string | Date;
}

export interface Tag {
  uid: string;
  text: string;
  count?: number;
}

export interface Media {
  uid: string;
  url: string;
  filename: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  postId?: string | null;
  createdAt?: string | Date;
}

export type ReactionType = "LIKE" | "DISLIKE" | "HEART" | "BOOKMARK" | string;

export interface Reaction {
  uid: string;
  type: string;
  userId: string;
  postId?: string;
  createdAt?: string | Date;
}

export interface UserReact {
  userId: string;
  postId: string;
  type: ReactionType;
  weight?: number;
}

export interface Post {
  uid: string;
  feedItemId?: string;
  text: string;
  authorId: string | null;
  author?: User | null;
  createAt: string | Date;
  updateAt: string | Date;
  tags?: Tag[];
  media?: Media[];
  reactions?: Reaction[];
  _count?: {
    reactions: number;
    posts?: number;
  };
}

export type FeedMode = "random" | "latest" | "trending";

export interface FeedOptions {
  limit?: number;
  excludeIds?: string[];
  tag?: string;
  mode?: FeedMode;
}

export interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  count: number;
}

export interface GetPostsOptions {
  id?: string;
  search?: string;
  tag?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
  excludeIds?: string[];
}

export interface CreatePostInput {
  text: string;
  tags?: string[];
}

export interface UpdatePostInput {
  text: string;
  tags?: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  username: string;
  password?: string;
}

export interface UploadMediaResponse {
  success: boolean;
  media: Media & { markdown: string };
}

export interface PostResponse {
  post: Post;
  success?: boolean;
}

export interface RecommendationsResponse {
  recommendations: Post[];
}

export interface TrendingTagsResponse {
  tags: Tag[];
}

export interface DemoUsersResponse {
  users: User[];
}

export interface ReactionResult {
  reacted?: boolean;
  success?: boolean;
  type: string;
  userId?: string;
  postId?: string;
}
