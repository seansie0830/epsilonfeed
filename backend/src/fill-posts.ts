import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of the working directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

/**
 * Locate the /post directory across common working directories
 */
function findPostDir(): string {
  const candidates = [
    process.env.POSTS_DIR,
    path.resolve(process.cwd(), "post"),
    path.resolve(process.cwd(), "../post"),
    path.resolve(__dirname, "../../post"),
    path.resolve(__dirname, "../post")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate the "/post" directory. Checked: \n${candidates.map((c) => ` - ${c}`).join("\n")}`
  );
}

/**
 * Recursively collect all markdown (.md) post files
 */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Ignore hidden or system directories
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...collectMarkdownFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // Ignore strategy blueprints, readme, or draft files
      const lower = entry.name.toLowerCase();
      if (
        !lower.startsWith("content_strategy") &&
        !lower.startsWith("readme") &&
        !lower.startsWith(".") &&
        !lower.endsWith(".draft.md")
      ) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

/**
 * Extract hashtags from markdown text, ignoring code blocks and CSS/hex patterns
 */
function extractHashtags(text: string): string[] {
  // Strip fenced code blocks and inline code
  const sanitized = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");

  // Match tags starting with letter or Chinese character (avoids hex colors like #fff or #333)
  const matches = sanitized.match(/#([a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)/g);
  if (!matches) return [];

  return Array.from(new Set(matches.map((t) => t.replace(/^#/, "").trim().toLowerCase())));
}

/**
 * Extract image markdown URLs
 */
function extractMediaUrls(text: string): string[] {
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

/**
 * Extract title from markdown (first # Heading) or fallback to filename
 */
function extractTitle(content: string, fallback: string): string {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.replace(/^#\s+/, "").trim();
    }
  }
  return fallback;
}

/**
 * Parse optional frontmatter and body
 */
function parseFrontmatter(raw: string): {
  author?: string;
  tags: string[];
  body: string;
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { tags: [], body: raw };
  }

  const endIdx = trimmed.indexOf("\n---", 3);
  if (endIdx === -1) {
    return { tags: [], body: raw };
  }

  const header = trimmed.slice(3, endIdx).trim();
  const body = trimmed.slice(endIdx + 4).trimStart();
  let author: string | undefined;
  const tags: string[] = [];

  for (const line of header.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();

    if (key === "author") {
      author = val.replace(/['"]/g, "").trim();
    } else if (key === "tags") {
      const parsedTags = val
        .replace(/[\[\]'"]/g, "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      tags.push(...parsedTags);
    }
  }

  return { author, tags, body };
}

/**
 * Ensure an admin user exists to serve as default author
 */
async function getOrCreateAdminUser(): Promise<{ uid: string; username: string }> {
  // 1. Try finding any user with roles: ADMIN
  const admin = await prisma.user.findFirst({
    where: { roles: "ADMIN" }
  });
  if (admin) return admin;

  // 2. Try finding user 'alex_dev' (default admin from seed.ts)
  const alex = await prisma.user.findUnique({
    where: { username: "alex_dev" }
  });
  if (alex) return alex;

  // 3. Fall back to creating a default admin user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);
  const newAdmin = await prisma.user.create({
    data: {
      username: "admin",
      displayName: "System Administrator",
      hashedPwd: passwordHash,
      roles: "ADMIN",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    }
  });

  console.log(`[Init] Created default admin user: ${newAdmin.username} (${newAdmin.uid})`);
  return newAdmin;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes("--clean") || args.includes("--wipe") || args.includes("--force");

  console.log("==========================================");
  console.log("  EpsilonFeed - Post Database Ingestion   ");
  console.log("==========================================");

  // 1. Locate the /post directory
  const postDir = findPostDir();
  console.log(`📁 Target folder: ${postDir}`);

  // 2. Collect all markdown files
  const mdFiles = collectMarkdownFiles(postDir);
  console.log(`📄 Found ${mdFiles.length} markdown post files.`);

  if (mdFiles.length === 0) {
    console.warn("⚠️ No markdown files found to ingest.");
    return;
  }

  // 3. Resolve Admin User (default author if author is null)
  const defaultAdmin = await getOrCreateAdminUser();
  console.log(`👤 Default admin author: @${defaultAdmin.username} (${defaultAdmin.uid})`);

  // Optional: wipe existing posts if --clean is passed
  if (shouldClean) {
    console.log("🧹 --clean flag specified: Clearing existing posts, media, and reactions...");
    await prisma.reaction.deleteMany();
    await prisma.media.deleteMany();
    await prisma.post.deleteMany();
    console.log("✅ Existing posts cleared.");
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const uniqueTagsSet = new Set<string>();

  console.log("\n🚀 Ingesting posts into database container...");

  for (let i = 0; i < mdFiles.length; i++) {
    const filePath = mdFiles[i];
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const filename = path.basename(filePath, ".md");

    // Parse frontmatter & body
    const { author: specifiedAuthor, tags: fmTags, body } = parseFrontmatter(fileContent);
    const postContent = fileContent; // Retain full markdown content
    const title = extractTitle(postContent, filename);

    // Resolve author: If null or specified author not found, default to admin
    let authorId = defaultAdmin.uid;
    if (specifiedAuthor) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ uid: specifiedAuthor }, { username: specifiedAuthor }]
        }
      });
      if (user) {
        authorId = user.uid;
      } else {
        // Default to admin if specified author is null or not found
        authorId = defaultAdmin.uid;
      }
    }

    // Extract tags
    const inlineTags = extractHashtags(body);
    const combinedTags = Array.from(new Set([...fmTags, ...inlineTags]));
    combinedTags.forEach((t) => uniqueTagsSet.add(t));

    // Extract media URLs
    const mediaUrls = extractMediaUrls(body);

    const tagConnectOrCreate = combinedTags.map((t) => ({
      where: { text: t },
      create: { text: t }
    }));

    // Check if post already exists (by exact text or first title line)
    const existingPost = await prisma.post.findFirst({
      where: {
        OR: [
          { text: postContent },
          { text: { startsWith: `# ${title}` } }
        ]
      },
      select: { uid: true, text: true }
    });

    if (existingPost) {
      if (existingPost.text === postContent) {
        skippedCount++;
      } else {
        // Content changed, update it
        await prisma.post.update({
          where: { uid: existingPost.uid },
          data: {
            text: postContent,
            authorId,
            tags: {
              set: [],
              connectOrCreate: tagConnectOrCreate
            }
          }
        });
        updatedCount++;
      }
    } else {
      // Create new post
      const newPost = await prisma.post.create({
        data: {
          text: postContent,
          authorId,
          tags: {
            connectOrCreate: tagConnectOrCreate
          }
        }
      });

      // Link any existing unlinked media
      if (mediaUrls.length > 0) {
        await prisma.media.updateMany({
          where: {
            url: { in: mediaUrls },
            postId: null
          },
          data: {
            postId: newPost.uid
          }
        });
      }

      insertedCount++;
    }

    if ((i + 1) % 25 === 0 || i + 1 === mdFiles.length) {
      console.log(`⏳ Progress: [${i + 1}/${mdFiles.length}] processed...`);
    }
  }

  console.log("\n==========================================");
  console.log("🎉 Ingestion complete!");
  console.log(`- Total markdown files: ${mdFiles.length}`);
  console.log(`- Newly inserted:       ${insertedCount}`);
  console.log(`- Updated:              ${updatedCount}`);
  console.log(`- Skipped (unchanged):  ${skippedCount}`);
  console.log(`- Total tags indexed:   ${uniqueTagsSet.size}`);
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Ingestion failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
