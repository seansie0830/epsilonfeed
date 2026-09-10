import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, getUserByUsernameWithPwd, getUserById } from "../repo/user.repo.js";

const JWT_SECRET = process.env.JWT_SECRET || "epsilonfeed_super_secret_jwt_key_2026";

export async function register(username: string, password: string,displayName?: string) {
  const existing = await getUserByUsernameWithPwd(username);
  if (existing) {
    throw new Error("Username already taken");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPwd = await bcrypt.hash(password, salt);

  const user = await createUser({
    username,
    hashedPwd,
    displayName
  });

  const token = jwt.sign(
    { uid: user.uid, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { user, token };
}

export async function getJWTtoken(username: string, pwd: string) {
  const user = await getUserByUsernameWithPwd(username);
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const isValid = await bcrypt.compare(pwd, user.hashedPwd);
  if (!isValid) {
    throw new Error("Invalid username or password");
  }

  const token = jwt.sign(
    { uid: user.uid, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      uid: user.uid,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
      createdAt: user.createdAt
    }
  };
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; username: string; roles: string };
    const user = await getUserById(decoded.uid);
    return user;
  } catch {
    return null;
  }
}

