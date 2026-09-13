# EpsilonFeed

A modern, interactive knowledge-sharing feed application built with **React (Vite)**, **Express**, **Prisma**, and **PostgreSQL with pgvector**.

---

## Quick Start

### 1. Start the Database
The project uses PostgreSQL with the `pgvector` extension running in Docker (port `5433` by default to avoid port conflicts).

```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Sync Database Schema & Seed
```bash
# Push Prisma schema to PostgreSQL
pnpm --filter backend exec prisma db push

# Seed demo users and initial posts
pnpm seed
```

### 4. Start Development Servers
```bash
# Start both backend and frontend concurrently
pnpm dev

# Or run separately:
pnpm dev:backend   # Express API server on http://localhost:3000
pnpm dev:frontend  # Vite React App on http://localhost:5173
```

---

## Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Start Docker Database** | `docker compose up -d` |
| **Stop Docker Database** | `docker compose down` |
| **View Database Logs** | `docker compose logs -f postgres` |
| **Sync Prisma Schema** | `pnpm --filter backend exec prisma db push` |
| **Prisma Studio (Web GUI)** | `pnpm --filter backend exec prisma studio` |
| **Seed Database** | `pnpm seed` |
| **Fill Posts from /post** | `pnpm fill:posts` (or `pnpm seed:posts`) |
| **Clean & Refill Posts** | `pnpm fill:posts --clean` |
| **Build All Packages** | `pnpm build` |
| **Start Dev Environment** | `pnpm dev` |
| **Start Backend Dev** | `pnpm dev:backend` |
| **Start Frontend Dev** | `pnpm dev:frontend` |

---

## Vector Search & Embeddings

- **Vector Dimension**: `768` dimensions (`vector(768)`).
- **Index Type**: HNSW (Hierarchical Navigable Small World) with Cosine Distance (`vector_cosine_ops`).
- **Recommended Models**:
  - `nomic-embed-text-v1.5` / `bge-base-en-v1.5` (768 dim)
  - `text-embedding-3-small` (OpenAI, configured with `dimensions: 768` or `512` via Matryoshka learning)
  - `all-MiniLM-L6-v2` / `bge-small-en-v1.5` (384 dim, adjust schema accordingly if chosen)

### Creating HNSW Indexes Manually (if required)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Post embedding index (Cosine similarity)
CREATE INDEX IF NOT EXISTS post_vec_hnsw_idx 
ON "Post" USING hnsw (vec vector_cosine_ops);

-- User preference embedding index (Cosine similarity)
CREATE INDEX IF NOT EXISTS user_vec_hnsw_idx 
ON "User" USING hnsw (vec vector_cosine_ops);
```

---

## Environment Variables

In `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/epsilonfeed?schema=public"
JWT_SECRET="epsilon_feed_secret_key_2026"
PORT=3000
```
