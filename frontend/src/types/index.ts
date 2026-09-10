export interface User {
  uid: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string;
  createdAt?: string;
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
}

export interface Reaction {
  uid: string;
  type: string;
  userId: string;
}

export interface Post {
  uid: string;
  text: string;
  authorId: string | null;
  author?: User | null;
  createAt: string;
  updateAt: string;
  tags?: Tag[];
  media?: Media[];
  reactions?: Reaction[];
  _count?: {
    reactions: number;
  };
}

export interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  count: number;
}
