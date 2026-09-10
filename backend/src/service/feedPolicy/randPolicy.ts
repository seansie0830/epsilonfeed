import { getRandomPostsSample } from "../../repo/post.repo.js";

export async function randPolicy(uid: String, params: Object) {
  const k = params.k ?? 6;
  return getRandomPostsSample(k);
}
