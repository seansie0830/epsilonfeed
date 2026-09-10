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

export async function getUserStrategyJson(id: string) {
  const user = await prisma.user.findUnique({
    where: { uid: id },
    select: { strategy: true }
  });
  return user?.strategy ? JSON.parse(user.strategy) : null;
}

export async function getVecById(id: string) {
  const user = await prisma.user.findUnique({
    where: { uid: id },
    select: { vec: true }
  });
  return user?.vec;
}

