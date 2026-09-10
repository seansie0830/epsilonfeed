import { prisma } from "./db.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding EpsilonFeed database...");

  // Clear existing data for fresh seed if needed
  await prisma.reaction.deleteMany();
  await prisma.media.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tags.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  // Create demo users
  const user1 = await prisma.user.create({
    data: {
      username: "alex_dev",
      displayName: "Alex Rivera",
      hashedPwd: passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      roles: "ADMIN"
    }
  });

  const user2 = await prisma.user.create({
    data: {
      username: "elena_design",
      displayName: "Elena Rostova",
      hashedPwd: passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      roles: "USER"
    }
  });

  const user3 = await prisma.user.create({
    data: {
      username: "marcus_cloud",
      displayName: "Marcus Chen",
      hashedPwd: passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      roles: "USER"
    }
  });

  console.log("Created 3 demo users.");

  const samplePosts = [
    {
      authorId: user1.uid,
      text: `# 🚀 Welcome to EpsilonFeed!

We're excited to launch **EpsilonFeed** — a modern, fast, and interactive knowledge-sharing feed built with **React, Vite, Express, and Prisma**.

### Key Highlights:
- ✍️ **Markdown by default**: Write headings, lists, code blocks, blockquotes, and tables seamlessly.
- ⚡ **In-webpage editing**: Edit your posts directly on the card without losing your place.
- 🖼️ **Image Normalization**: Paste or drop images directly. They are normalized, converted to lightweight WebP, and auto-embedded.
- 🔄 **Infinite Scrolling & Smart Feed**: Dynamic randomized content sampling keeps your feed fresh.

\`\`\`typescript
// Quick glance at the image normalization pipeline
const result = await sharp(buffer)
  .rotate()
  .resize({ width: 1920, height: 1080, fit: "inside" })
  .webp({ quality: 85 })
  .toBuffer();
\`\`\`

Try editing this post right now using the **Edit** button below! #welcome #announcement #react #vite`,
      tags: ["welcome", "announcement", "react", "vite"]
    },
    {
      authorId: user2.uid,
      text: `### 🎨 Modern UI Design Principles in 2026

When designing modern web applications, subtle glassmorphism and crisp typography can make all the difference.

![Futuristic Workspace](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80)

Here is a checklist for designing responsive cards:
- [x] Smooth border-radius with subtle 1px border highlights
- [x] Backdrop blur for overlays and navbars
- [x] Dark/light theme support with consistent contrast ratios
- [ ] Micro-interactions on button hover & active states

What design patterns are you using in your latest projects? #design #ui #ux #webdev`,
      tags: ["design", "ui", "ux", "webdev"]
    },
    {
      authorId: user3.uid,
      text: `### ⚡ Building Fast Full-Stack Backbones with SQLite & Prisma

SQLite has evolved significantly. For lightweight services, edge workloads, and fast local prototypes, SQLite with Prisma is blazing fast!

> **Tip:** By pairing SQLite with a non-deterministic sampling feed algorithm, you can achieve instantaneous response times with zero network overhead.

\`\`\`bash
# Run database migrations
pnpm --filter backend exec prisma db push
\`\`\`

Give it a thumbs up if you love zero-maintenance setups! #sqlite #prisma #backend #typescript`,
      tags: ["sqlite", "prisma", "backend", "typescript"]
    },
    {
      authorId: user1.uid,
      text: `### 📸 Working with the Normalized Image Embedding Pipeline

Notice how images adapt automatically to light and dark themes.

![Clean Minimalist Setup](https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&auto=format&fit=crop&q=80)

You can copy an image from anywhere on your computer and press **Ctrl+V** inside the in-webpage editor. The server will:
1. Strip EXIF metadata
2. Resize to max dimensions
3. Convert to WebP
4. Embed the markdown automatically!

#tech #images #productivity`,
      tags: ["tech", "images", "productivity"]
    },
    {
      authorId: user2.uid,
      text: `### 💡 Quick Tip: Mastering Markdown Checklists

Did you know you can easily manage interactive tasks right inside your posts?

- [x] Set up React + Vite frontend
- [x] Configure Tailwind CSS with modern color palette
- [x] Build in-webpage inline markdown editor
- [x] Implement image normalization with Sharp
- [x] Enable infinite scrolling feed

Try checking off your tasks in the editor! #markdown #productivity #frontend`,
      tags: ["markdown", "productivity", "frontend"]
    }
  ];

  for (const postData of samplePosts) {
    const post = await prisma.post.create({
      data: {
        text: postData.text,
        authorId: postData.authorId,
        tags: {
          connectOrCreate: postData.tags.map((t) => ({
            where: { text: t },
            create: { text: t }
          }))
        }
      }
    });

    // Add a reaction from other users
    await prisma.reaction.create({
      data: {
        userId: user3.uid,
        postId: post.uid,
        type: "LIKE"
      }
    });
  }

  console.log(`Seeded ${samplePosts.length} posts with tags and reactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
