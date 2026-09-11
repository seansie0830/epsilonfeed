import { prisma } from "../db.js";

export async function getUser(option: { username?: string } = {}) {
  const { username } = option;
  if (!username) return null;
  return prisma.user.findUnique({
    where: { username },
    select: {
      uid: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      roles: true,
      createdAt: true
    }
  });
}

export async function getUserByUsernameWithPwd(username: string) {
  return prisma.user.findUnique({
    where: { username }
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { uid: id },
    select: {
      uid: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      roles: true,
      createdAt: true
    }
  });
}

export async function createUser(data: {
  username: string;
  hashedPwd: string;
  displayName?: string;
  avatarUrl?: string;
  roles?: string;
  strategy?: string;
}) {
  return prisma.user.create({
    data: {
      username: data.username,
      hashedPwd: data.hashedPwd,
      displayName: data.displayName || data.username,
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username)}`,
      roles: data.roles || "USER",
      strategy: data.strategy || "default"
    },
    select: {
      uid: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      roles: true,
      createdAt: true
    }
  });
}

export async function getUserStrategyJson(id?: string) {
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { uid: id },
    select: { strategy: true }
  });
  if (!user?.strategy) return null;
  try {
    const parsed = JSON.parse(user.strategy);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return { strategy: String(parsed) };
  } catch {
    return { strategy: user.strategy };
  }
}

export async function getVecById(id: string): Promise<string | null> {
  const results = await prisma.$queryRaw<Array<{ vec: string | null }>>`
    SELECT vec::text FROM "User" WHERE uid = ${id} LIMIT 1;
  `;
  return results[0]?.vec ?? null;
}

export async function updateUserById(
  id: string,
  data: {
    displayName?: string;
    avatarUrl?: string;
    roles?: string;
    strategy?: string;
  }
) {
  return prisma.user.update({
    where: { uid: id },
    data,
    select: {
      uid: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      roles: true,
      createdAt: true
    }
  });
}

export async function updateUserVec(id: string, vec: number[] | Float32Array) {
  const vecArray = Array.isArray(vec) ? vec : Array.from(vec);
  const vectorStr = `[${vecArray.join(",")}]`;
  await prisma.$executeRaw`
    UPDATE "User"
    SET vec = ${vectorStr}::vector
    WHERE uid = ${id};
  `;
}
