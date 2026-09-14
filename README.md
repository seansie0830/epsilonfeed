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
| **Fill Vector Embeddings** | `pnpm fill:vec` |
| **Interactive Vector Fill** | `pnpm fill:vec --interact` |
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

### Vector Ingestion Script (`pnpm fill:vec`)

The project includes an ingestion CLI script to compute embeddings for posts and write them into PostgreSQL (`Post.vec`). It uses OpenAI-compatible `/embeddings` endpoints (such as OpenRouter, OpenAI, SiliconFlow, or local Ollama).

#### 1. Interactive Mode
If parameters or API keys are missing, the script automatically launches an interactive wizard. You can also explicitly trigger it:

```bash
pnpm fill:vec --interact
# or short flag
pnpm fill:vec -i
```

The interactive wizard allows you to:
- Select or customize API Base URL (OpenRouter, OpenAI, SiliconFlow, Ollama, Custom)
- Input or update API keys (with optional saving directly into `backend/.env`)
- Choose from pre-configured free/budget 768-dimensional models
- Toggle between updating missing posts only (`vec IS NULL`) or recomputing all posts
- Configure batch size and preview before execution

#### 2. Direct Execution (via `.env`)
Configure your API key in `backend/.env` (see below), then run:

```bash
# Compute embeddings for all posts where vec IS NULL (default)
pnpm fill:vec

# Recompute embeddings for all posts in database
pnpm fill:vec --all

# Test run with a limited number of posts without saving to DB
pnpm fill:vec --limit 5 --dry-run
```

#### 3. CLI Options Reference

| Option | Shorthand | Description |
| :--- | :--- | :--- |
| `--interact` | `-i` | Launch interactive configuration wizard |
| `--missing` | `-m` | Process only posts where `vec IS NULL` (default behavior) |
| `--all` | `-a` | Process all posts (recomputes existing vectors) |
| `--limit <n>` | `-l <n>` | Limit processing to at most `<n>` posts |
| `--batch-size <n>` | `-b <n>` | Number of posts per batch request (default: `10`) |
| `--model <name>` | | Custom embedding model identifier |
| `--base-url <url>` | `--url` | OpenAI-compatible endpoint URL (default: `https://openrouter.ai/api/v1`) |
| `--api-key <key>` | `--key` | API Key (overrides `.env`) |
| `--dry-run` | | Compute embeddings and preview output without DB writes |
| `--help` | `-h` | Display help menu |

---

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
# Database Connection (PostgreSQL with pgvector)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/epsilonfeed?schema=public"

# JWT & Server
JWT_SECRET="epsilon_feed_secret_key_2026"
PORT=3000

# OpenAI-compatible / OpenRouter Embedding Configuration
OPENROUTER_API_KEY="sk-or-v1-......"
# OPENAI_API_KEY=""

# Optional overrides
# OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
# EMBEDDING_MODEL="openai/text-embedding-3-small"
# EMBEDDING_BATCH_SIZE=10
```
