import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { GetPostsOptions } from "@epsilonfeed/shared";

export type { GetPostsOptions };

export async function getPosts(options: GetPostsOptions = {}) {
  const {
    id,
    authorId,
    tag,
    search,
    limit = 10,
    offset = 0,
    excludeIds = []
  } = options;

  const where: any = {};

  if (id) {
    where.uid = id;
  }
  if (authorId) {
    where.authorId = authorId;
  }
  if (excludeIds.length > 0) {
    where.uid = { notIn: excludeIds };
  }
  if (tag) {
    where.tags = {
      some: {
        text: tag.toLowerCase()
      }
    };
  }
  if (search) {
    where.text = {
      contains: search
    };
  }

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createAt: "desc" },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        tags: true,
        media: true,
        _count: {
          select: { reactions: true }
        }
      }
    })
  ]);

  return { total, posts };
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { uid: id },
    include: {
      author: {
        select: {
          uid: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      },
      tags: true,
      media: true,
      reactions: {
        select: {
          uid: true,
          type: true,
          userId: true
        }
      },
      _count: {
        select: { reactions: true }
      }
    }
  });
}

export async function createPostInDb(data: {
  text: string;
  authorId?: string;
  tags?: string[];
  mediaUrls?: string[];
}) {
  const { text, authorId, tags = [], mediaUrls = [] } = data;

  const tagConnectOrCreate = tags.map((t) => {
    const cleaned = t.replace(/^#/, "").trim().toLowerCase();
    return {
      where: { text: cleaned },
      create: { text: cleaned }
    };
  });

  const post = await prisma.post.create({
    data: {
      text,
      authorId: authorId || null,
      tags: {
        connectOrCreate: tagConnectOrCreate
      }
    },
    include: {
      author: {
        select: {
          uid: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      },
      tags: true,
      media: true,
      _count: {
        select: { reactions: true }
      }
    }
  });

  // If there are media URLs mentioned, link them to the post
  if (mediaUrls.length > 0) {
    await prisma.media.updateMany({
      where: {
        url: { in: mediaUrls },
        postId: null
      },
      data: {
        postId: post.uid
      }
    });
  }

  return getPostById(post.uid);
}

export async function updatePostInDb(
  id: string,
  data: {
    text: string;
    tags?: string[];
  }
) {
  const { text, tags = [] } = data;

  const tagConnectOrCreate = tags.map((t) => {
    const cleaned = t.replace(/^#/, "").trim().toLowerCase();
    return {
      where: { text: cleaned },
      create: { text: cleaned }
    };
  });

  await prisma.post.update({
    where: { uid: id },
    data: {
      text,
      tags: {
        set: [], // Clear old tags
        connectOrCreate: tagConnectOrCreate
      }
    }
  });

  return getPostById(id);
}

export async function deletePostFromDb(id: string) {
  return prisma.post.delete({
    where: { uid: id }
  });
}

export async function togglePostReaction(postId: string, userId: string, type = "LIKE") {
  const existing = await prisma.reaction.findUnique({
    where: {
      userId_postId_type: {
        userId,
        postId,
        type
      }
    }
  });

  if (existing) {
    await prisma.reaction.delete({
      where: { uid: existing.uid }
    });
    return { reacted: false, type };
  } else {
    await prisma.reaction.create({
      data: {
        userId,
        postId,
        type
      }
    });
    return { reacted: true, type };
  }
}

/**
 * Returns a randomized non-deterministic sample of posts for the feed stream.
 * In dev mode, if all posts have been seen, it recycles and samples across the full pool.
 */
export async function getRandomPostsSample(limit = 10, excludeIds: string[] = []) {
  let count = await prisma.post.count({
    where: {
      ...(excludeIds.length > 0 ? { uid: { notIn: excludeIds } } : {})
    }
  });

  // If all posts were excluded, allow repeat sampling across the entire post collection
  let effectiveExclude = excludeIds;
  if (count === 0) {
    count = await prisma.post.count();
    effectiveExclude = [];
  }

  if (count === 0) return [];

  // Random offset sampling to get non-deterministic feed items
  const maxSkip = Math.max(0, count - limit);
  const randomSkip = Math.floor(Math.random() * (maxSkip + 1));

  const posts = await prisma.post.findMany({
    where: {
      ...(effectiveExclude.length > 0 ? { uid: { notIn: effectiveExclude } } : {})
    },
    take: limit * 2, // Fetch pool and shuffle
    skip: randomSkip,
    include: {
      author: {
        select: {
          uid: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      },
      tags: true,
      media: true,
      reactions: {
        select: {
          uid: true,
          type: true,
          userId: true
        }
      },
      _count: {
        select: { reactions: true }
      }
    }
  });

  // In-memory Fisher-Yates shuffle for true non-deterministic order
  for (let i = posts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [posts[i], posts[j]] = [posts[j], posts[i]];
  }

  return posts.slice(0, limit);
}


/**
 * Returns recommendations for the bottom of a post ("You May Also Like")
 */
export async function getPostRecommendations(postId: string, limit = 3) {
  const currentPost = await prisma.post.findUnique({
    where: { uid: postId },
    include: { tags: true }
  });

  const tagNames = currentPost?.tags.map((t) => t.text) || [];

  // First try finding posts sharing tags
  let recommended = await prisma.post.findMany({
    where: {
      uid: { not: postId },
      ...(tagNames.length > 0
        ? {
            tags: {
              some: {
                text: { in: tagNames }
              }
            }
          }
        : {})
    },
    take: limit,
    orderBy: { createAt: "desc" },
    include: {
      author: {
        select: {
          uid: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      },
      tags: true,
      media: true,
      _count: {
        select: { reactions: true }
      }
    }
  });

  // If not enough tagged matches, fill with other recent posts
  if (recommended.length < limit) {
    const existingIds = [postId, ...recommended.map((p) => p.uid)];
    const fallback = await prisma.post.findMany({
      where: {
        uid: { notIn: existingIds }
      },
      take: limit - recommended.length,
      orderBy: { createAt: "desc" },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        tags: true,
        media: true,
        _count: {
          select: { reactions: true }
        }
      }
    });
    recommended = [...recommended, ...fallback];
  }

  return recommended;
}

export async function getTopKsimPostByVec(
  vec: number[] | Float32Array,
  limit = 6,
  excludeIds: string[] = []
) {
  const vecArray = Array.isArray(vec) ? vec : Array.from(vec);
  const vectorStr = `[${vecArray.join(",")}]`;
  const excludeCondition =
    excludeIds.length > 0
      ? Prisma.sql`AND uid NOT IN (${Prisma.join(excludeIds)})`
      : Prisma.empty;

  const rawPosts = await prisma.$queryRaw<
    Array<{
      uid: string;
      similarity: number;
    }>
  >`
    SELECT 
      uid,
      1 - (vec <=> ${vectorStr}::vector) AS similarity
    FROM "Post"
    WHERE vec IS NOT NULL
      ${excludeCondition}
    ORDER BY vec <=> ${vectorStr}::vector ASC
    LIMIT ${limit};
  `;

  if (rawPosts.length === 0) return [];

  const postIds = rawPosts.map((p) => p.uid);
  const fullPosts = await prisma.post.findMany({
    where: { uid: { in: postIds } },
    include: {
      author: {
        select: {
          uid: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      },
      tags: true,
      media: true,
      reactions: {
        select: {
          uid: true,
          type: true,
          userId: true
        }
      },
      _count: {
        select: { reactions: true }
      }
    }
  });

  const postMap = new Map(fullPosts.map((p) => [p.uid, p]));
  return rawPosts
    .map((r) => {
      const p = postMap.get(r.uid);
      return p ? { ...p, similarity: r.similarity } : null;
    })
    .filter(Boolean);
}

export async function updatePostVec(id: string, vec: number[] | Float32Array) {
  const vecArray = Array.isArray(vec) ? vec : Array.from(vec);
  const vectorStr = `[${vecArray.join(",")}]`;
  await prisma.$executeRaw`
    UPDATE "Post"
    SET vec = ${vectorStr}::vector, "updateAt" = NOW()
    WHERE uid = ${id};
  `;
}
