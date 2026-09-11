import { z } from "zod";
import { getRandomPostsSample } from "../../repo/post.repo.js";
import { FeedOptions } from "@epsilonfeed/shared";

// 定義 Schema：自動轉型數字、限制為正整數、提供預設值 6
const PolicyParamsSchema = z.object({
  k: z.coerce.number().int().positive().default(6),
});

export async function randPolicy(uid?: string, rawParams?: unknown, options?: FeedOptions) {
  // safeParse 即使驗證失敗也不會 throw Error，方便優雅處理
  const result = PolicyParamsSchema.safeParse(rawParams);

  // 若解析成功使用解析值，若格式整個爛掉（如傳陣列/字串進來）則回退到 options.limit 或 6
  const k = result.success ? result.data.k : (options?.limit ?? 6);
  const excludeIds = options?.excludeIds ?? [];

  return getRandomPostsSample(k, excludeIds);
}

