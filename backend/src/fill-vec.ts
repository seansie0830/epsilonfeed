import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { updatePostVec } from "./repo/post.repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/.env and project root .env
const backendEnvPath = path.resolve(__dirname, "../.env");
const rootEnvPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
dotenv.config();

// Supported model presets
interface ModelPreset {
  id: string;
  name: string;
  providerNote: string;
  defaultBaseUrl: string;
  dimensions: number;
  isFreeOrCheap: boolean;
  supportsDimensionsParam: boolean;
}

const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "openai/text-embedding-3-small",
    name: "OpenRouter - text-embedding-3-small (Recommended / Near-Free)",
    providerNote: "~$0.02 / 1M tokens (sub-cent for entire db), 768 native dim",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    dimensions: 768,
    isFreeOrCheap: true,
    supportsDimensionsParam: true
  },
  {
    id: "text-embedding-3-small",
    name: "OpenAI Direct - text-embedding-3-small",
    providerNote: "Standard OpenAI endpoint with dimensions: 768",
    defaultBaseUrl: "https://api.openai.com/v1",
    dimensions: 768,
    isFreeOrCheap: true,
    supportsDimensionsParam: true
  },
  {
    id: "baai/bge-m3",
    name: "SiliconFlow / BAAI - bge-m3 (Free tier available)",
    providerNote: "Multilingual, free on SiliconFlow (api.siliconflow.cn)",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
    dimensions: 1024,
    isFreeOrCheap: true,
    supportsDimensionsParam: false
  },
  {
    id: "nomic-embed-text",
    name: "Ollama / Local - nomic-embed-text (100% Free / Offline)",
    providerNote: "Native 768 dimensions, runs locally via Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    dimensions: 768,
    isFreeOrCheap: true,
    supportsDimensionsParam: false
  }
];

interface FillVecConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions: number;
  supportsDimensionsParam: boolean;
  batchSize: number;
  allPosts: boolean;
  limit?: number;
  dryRun: boolean;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const config: Partial<FillVecConfig> & { isInteractive: boolean; help: boolean } = {
    isInteractive: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--interact" || arg === "--interactive" || arg === "-i") {
      config.isInteractive = true;
    } else if (arg === "--all" || arg === "-a") {
      config.allPosts = true;
    } else if (arg === "--missing" || arg === "-m") {
      config.allPosts = false;
    } else if (arg === "--dry-run") {
      config.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      config.help = true;
    } else if (arg === "--limit" || arg === "-l") {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) config.limit = val;
    } else if (arg === "--batch-size" || arg === "-b") {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) config.batchSize = val;
    } else if (arg === "--model") {
      config.model = args[++i];
    } else if (arg === "--base-url" || arg === "--url") {
      config.baseUrl = args[++i];
    } else if (arg === "--api-key" || arg === "--key") {
      config.apiKey = args[++i];
    }
  }

  return config;
}

function printHelp() {
  console.log(`
EpsilonFeed - Vector Embedding Populator

Usage:
  pnpm fill:vec [options]

Options:
  --interact, -i            Launch interactive setup wizard
  --all, -a                 Process all posts (recompute existing embeddings)
  --missing, -m             Process only posts without vector (default)
  --limit <num>, -l <num>   Process at most <num> posts (useful for testing)
  --batch-size <num>, -b    Number of posts per API batch (default: 10)
  --model <name>            Embedding model name (e.g. openai/text-embedding-3-small)
  --base-url <url>          OpenAI-compatible Base URL (default: https://openrouter.ai/api/v1)
  --api-key <key>           API Key (can also be read from .env)
  --dry-run                 Compute embeddings without saving to database
  --help, -h                Show this help menu

Environment Variables (.env):
  OPENROUTER_API_KEY / OPENAI_API_KEY
  OPENROUTER_BASE_URL / OPENAI_BASE_URL (default: https://openrouter.ai/api/v1)
  EMBEDDING_MODEL                      (default: openai/text-embedding-3-small)
  EMBEDDING_DIMENSIONS                 (default: 768)
  EMBEDDING_BATCH_SIZE                 (default: 10)
  `);
}

function maskKey(key: string): string {
  if (!key) return "(none)";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function runInteractiveWizard(currentConfig: Partial<FillVecConfig>): Promise<FillVecConfig> {
  const rl = readline.createInterface({ input, output });

  console.log("\n✨ ======================================================= ✨");
  console.log("       EpsilonFeed - Embedding Interactive Setup Wizard       ");
  console.log("✨ ======================================================= ✨\n");

  // 1. Base URL
  const defaultBaseUrl =
    currentConfig.baseUrl ||
    process.env.OPENROUTER_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://openrouter.ai/api/v1";

  console.log("1️⃣  API Provider / Base URL:");
  console.log(`   [Default]: ${defaultBaseUrl}`);
  const baseUrlInput = await rl.question(`   Enter Base URL (Press Enter to keep default): `);
  const baseUrl = baseUrlInput.trim() || defaultBaseUrl;

  // 2. API Key
  const envKey =
    currentConfig.apiKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  console.log("\n2️⃣  API Key:");
  if (envKey) {
    console.log(`   [Found in .env / CLI]: ${maskKey(envKey)}`);
  } else {
    console.log("   [No API key found in .env]");
  }
  const apiKeyInput = await rl.question(
    `   Enter API Key ${envKey ? "(Press Enter to keep existing key)" : ""}: `
  );
  const apiKey = apiKeyInput.trim() || envKey;

  if (!apiKey) {
    console.warn("⚠️  Warning: No API key provided. Requests may fail if the provider requires authentication.");
  }

  // 3. Model Selection
  console.log("\n3️⃣  Select Embedding Model (Optimized for 768 dimensions):");
  MODEL_PRESETS.forEach((preset, idx) => {
    console.log(`   [${idx + 1}] ${preset.name}`);
    console.log(`       └─ Notes: ${preset.providerNote} (dim: ${preset.dimensions})`);
  });
  console.log(`   [5] Custom model name (type your own)`);

  const currentModel =
    currentConfig.model ||
    process.env.EMBEDDING_MODEL ||
    MODEL_PRESETS[0].id;

  const defaultChoice = "1";
  const modelChoiceInput = await rl.question(`   Select [1-5] (default: 1): `);
  const choice = modelChoiceInput.trim() || defaultChoice;

  let selectedModel = currentModel;
  let supportsDimensionsParam = true;
  let modelDimensions = 768;

  if (choice === "1") {
    selectedModel = MODEL_PRESETS[0].id;
    supportsDimensionsParam = MODEL_PRESETS[0].supportsDimensionsParam;
    modelDimensions = MODEL_PRESETS[0].dimensions;
  } else if (choice === "2") {
    selectedModel = MODEL_PRESETS[1].id;
    supportsDimensionsParam = MODEL_PRESETS[1].supportsDimensionsParam;
    modelDimensions = MODEL_PRESETS[1].dimensions;
  } else if (choice === "3") {
    selectedModel = MODEL_PRESETS[2].id;
    supportsDimensionsParam = MODEL_PRESETS[2].supportsDimensionsParam;
    modelDimensions = MODEL_PRESETS[2].dimensions;
  } else if (choice === "4") {
    selectedModel = MODEL_PRESETS[3].id;
    supportsDimensionsParam = MODEL_PRESETS[3].supportsDimensionsParam;
    modelDimensions = MODEL_PRESETS[3].dimensions;
  } else if (choice === "5") {
    const custom = await rl.question(`   Enter model name: `);
    selectedModel = custom.trim() || currentModel;
    supportsDimensionsParam = selectedModel.includes("text-embedding-3");
  }

  // 4. Processing Target Mode
  console.log("\n4️⃣  Scope of posts to update:");
  console.log("   [1] Only posts without vector (vec IS NULL) [Recommended]");
  console.log("   [2] Recompute all posts (overwrite existing vectors)");
  const modeInput = await rl.question("   Select [1-2] (default: 1): ");
  const allPosts = modeInput.trim() === "2";

  // 5. Batch Size
  const defaultBatch = currentConfig.batchSize || parseInt(process.env.EMBEDDING_BATCH_SIZE || "10", 10);
  const batchInput = await rl.question(`\n5️⃣  Batch size [default: ${defaultBatch}]: `);
  const batchSize = parseInt(batchInput.trim(), 10) || defaultBatch;

  // Optional: Save to backend/.env
  if (apiKey && apiKey !== envKey) {
    const saveEnvAnswer = await rl.question(`\n💾 Save this API Key to backend/.env? [y/N]: `);
    if (saveEnvAnswer.trim().toLowerCase() === "y") {
      try {
        let envContent = fs.existsSync(backendEnvPath) ? fs.readFileSync(backendEnvPath, "utf-8") : "";
        if (envContent.includes("OPENROUTER_API_KEY=")) {
          envContent = envContent.replace(/OPENROUTER_API_KEY=.*/, `OPENROUTER_API_KEY="${apiKey}"`);
        } else {
          envContent += `\nOPENROUTER_API_KEY="${apiKey}"\n`;
        }
        if (!envContent.includes("OPENROUTER_BASE_URL=") && baseUrl !== "https://openrouter.ai/api/v1") {
          envContent += `OPENROUTER_BASE_URL="${baseUrl}"\n`;
        }
        fs.writeFileSync(backendEnvPath, envContent.trim() + "\n", "utf-8");
        console.log("   ✅ Saved settings to backend/.env");
      } catch (err) {
        console.warn("   ⚠️ Failed to write to backend/.env:", err);
      }
    }
  }

  // Summary & Confirmation
  console.log("\n📋 --- Execution Plan ---");
  console.log(`   Base URL:    ${baseUrl}`);
  console.log(`   API Key:     ${maskKey(apiKey)}`);
  console.log(`   Model:       ${selectedModel}`);
  console.log(`   Target:      ${allPosts ? "All posts" : "Posts where vec IS NULL"}`);
  console.log(`   Batch size:  ${batchSize}`);
  console.log("-------------------------\n");

  const confirm = await rl.question("🚀 Proceed with calculation? [Y/n]: ");
  rl.close();

  if (confirm.trim().toLowerCase() === "n") {
    console.log("Aborted by user.");
    process.exit(0);
  }

  return {
    baseUrl,
    apiKey,
    model: selectedModel,
    dimensions: modelDimensions,
    supportsDimensionsParam,
    batchSize,
    allPosts,
    limit: currentConfig.limit,
    dryRun: currentConfig.dryRun ?? false
  };
}

/**
 * Call OpenAI-compatible /embeddings API
 */
async function fetchEmbeddings(
  baseUrl: string,
  apiKey: string,
  model: string,
  texts: string[],
  supportsDimensionsParam: boolean
): Promise<number[][]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/embeddings`;

  const requestBody: Record<string, unknown> = {
    model,
    input: texts
  };

  // If using OpenAI text-embedding-3 or compatible models, pass dimensions: 768
  if (supportsDimensionsParam || model.includes("text-embedding-3")) {
    requestBody.dimensions = 768;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "HTTP-Referer": "https://epsilonfeed.local",
    "X-Title": "EpsilonFeed"
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Embedding API error [HTTP ${response.status} ${response.statusText}] from ${url}:\n${errText}`
    );
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding: number[]; index: number }>;
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(`Embedding API response error: ${json.error.message}`);
  }

  if (!json.data || !Array.isArray(json.data)) {
    throw new Error(`Invalid response format from ${url}: missing data array.`);
  }

  // Sort by index to ensure original order
  json.data.sort((a, b) => a.index - b.index);

  return json.data.map((item) => item.embedding);
}

/**
 * Prepare markdown post content for embedding
 * Combines title, tags, and summary snippet (truncated safely to ~4000 characters)
 */
function prepareTextForEmbedding(text: string, tags: string[]): string {
  const tagPrefix = tags.length > 0 ? `Tags: ${tags.map((t) => `#${t}`).join(" ")}\n\n` : "";
  const fullText = (tagPrefix + text).trim();
  // Safe truncation limit for embedding models context window
  return fullText.slice(0, 4000);
}

async function main() {
  const cliConfig = parseCliArgs();

  if (cliConfig.help) {
    printHelp();
    return;
  }

  // Determine initial values
  const envApiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
  const envBaseUrl =
    process.env.OPENROUTER_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://openrouter.ai/api/v1";
  const envModel = process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";
  const envBatch = parseInt(process.env.EMBEDDING_BATCH_SIZE || "10", 10);

  const initialConfig: Partial<FillVecConfig> = {
    baseUrl: cliConfig.baseUrl || envBaseUrl,
    apiKey: cliConfig.apiKey || envApiKey,
    model: cliConfig.model || envModel,
    dimensions: 768,
    supportsDimensionsParam: (cliConfig.model || envModel).includes("text-embedding-3"),
    batchSize: cliConfig.batchSize || envBatch,
    allPosts: cliConfig.allPosts ?? false,
    limit: cliConfig.limit,
    dryRun: cliConfig.dryRun ?? false
  };

  // Launch interactive mode if explicitly requested OR if API key is missing
  let config: FillVecConfig;
  if (cliConfig.isInteractive || !initialConfig.apiKey) {
    if (!cliConfig.isInteractive && !initialConfig.apiKey) {
      console.log("ℹ️  No API key found in .env or arguments. Starting interactive prompt...");
    }
    config = await runInteractiveWizard(initialConfig);
  } else {
    config = {
      baseUrl: initialConfig.baseUrl!,
      apiKey: initialConfig.apiKey!,
      model: initialConfig.model!,
      dimensions: 768,
      supportsDimensionsParam: initialConfig.model!.includes("text-embedding-3"),
      batchSize: initialConfig.batchSize!,
      allPosts: initialConfig.allPosts!,
      limit: initialConfig.limit,
      dryRun: initialConfig.dryRun!
    };
  }

  console.log("==========================================");
  console.log("   EpsilonFeed - Vector Embedding Fill    ");
  console.log("==========================================");
  console.log(`🌐 Base URL:   ${config.baseUrl}`);
  console.log(`🔑 API Key:    ${maskKey(config.apiKey)}`);
  console.log(`🤖 Model:      ${config.model}`);
  console.log(`📦 Batch Size: ${config.batchSize}`);
  console.log(`🎯 Mode:       ${config.allPosts ? "All Posts" : "Missing Only (vec IS NULL)"}`);
  if (config.limit) console.log(`🛑 Limit:      ${config.limit} posts max`);
  if (config.dryRun) console.log(`🧪 DRY RUN:    Enabled (no DB writes)`);
  console.log("==========================================\n");

  // Query target posts from database
  console.log("🔍 Querying candidate posts from database...");
  let posts: Array<{ uid: string; text: string; tags: Array<{ text: string }> }>;

  if (config.allPosts) {
    posts = await prisma.post.findMany({
      select: { uid: true, text: true, tags: { select: { text: true } } },
      take: config.limit
    });
  } else {
    const limitClause = config.limit ? Prisma.sql`LIMIT ${config.limit}` : Prisma.empty;
    const missingRaw = await prisma.$queryRaw<Array<{ uid: string }>>`
      SELECT uid FROM "Post" WHERE vec IS NULL ${limitClause};
    `;
    const ids = missingRaw.map((r) => r.uid);
    posts = await prisma.post.findMany({
      where: { uid: { in: ids } },
      select: { uid: true, text: true, tags: { select: { text: true } } }
    });
  }

  const total = posts.length;
  console.log(`📊 Found ${total} post(s) to process.\n`);

  if (total === 0) {
    console.log("✅ All posts already have vectors! Nothing to update.");
    console.log("💡 Tip: Use `pnpm fill:vec --all` if you want to recalculate all vectors.");
    return;
  }

  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += config.batchSize) {
    const batch = posts.slice(i, i + config.batchSize);
    const batchTexts = batch.map((p) =>
      prepareTextForEmbedding(
        p.text,
        p.tags.map((t) => t.text)
      )
    );

    const batchStart = Date.now();
    try {
      const embeddings = await fetchEmbeddings(
        config.baseUrl,
        config.apiKey,
        config.model,
        batchTexts,
        config.supportsDimensionsParam
      );

      if (embeddings.length !== batch.length) {
        throw new Error(
          `API returned ${embeddings.length} embeddings, expected ${batch.length}`
        );
      }

      // Check dimension of first vector
      const actualDim = embeddings[0]?.length ?? 0;
      if (actualDim !== 768) {
        console.warn(
          `\n⚠️ Dimension Mismatch Warning: Model returned ${actualDim}-dim vector, but database requires vector(768).`
        );
        if (actualDim > 768 && (config.model.includes("text-embedding-3") || config.model.includes("openai"))) {
          console.warn(
            `💡 Tip: For OpenAI models, ensure dimensions: 768 is accepted by your proxy/provider.`
          );
        }
      }

      // Update database
      for (let j = 0; j < batch.length; j++) {
        const post = batch[j];
        let vec = embeddings[j];

        // If the dimension is not 768, truncate or slice if longer, or warn
        if (vec.length !== 768) {
          if (vec.length > 768) {
            // Slicing prefix (for models trained with Matryoshka embeddings)
            vec = vec.slice(0, 768);
          } else {
            throw new Error(
              `Vector dimension is ${vec.length}, which cannot fit into postgres vector(768). Please select a 768-dim model.`
            );
          }
        }

        if (!config.dryRun) {
          await updatePostVec(post.uid, vec);
        }
        successCount++;
      }

      processedCount += batch.length;
      const batchDuration = Date.now() - batchStart;
      const percent = ((processedCount / total) * 100).toFixed(1);
      const avgTimePerPost = (Date.now() - startTime) / processedCount;
      const remainingPosts = total - processedCount;
      const etaSeconds = Math.round((remainingPosts * avgTimePerPost) / 1000);

      console.log(
        `⏳ [${processedCount}/${total}] (${percent}%) | Batch ${batch.length} done in ${batchDuration}ms | Success: ${successCount} | ETA: ~${etaSeconds}s`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Error processing batch starting at index ${i}:`, msg);
      failureCount += batch.length;
      processedCount += batch.length;

      // Ask whether to continue or abort on batch error
      console.warn("⏩ Continuing to next batch...\n");
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n==========================================");
  console.log("🎉 Embedding generation completed!");
  console.log(`⏱️  Total duration:     ${totalDuration}s`);
  console.log(`✅ Successfully saved: ${successCount} post(s)`);
  if (failureCount > 0) {
    console.log(`❌ Failed:              ${failureCount} post(s)`);
  }
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
