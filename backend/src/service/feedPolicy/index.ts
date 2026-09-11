import { randPolicy } from "./randPolicy.js";
import { FeedOptions } from "@epsilonfeed/shared";

export type FeedPolicyHandler = (
  uid?: string,
  rawParams?: unknown,
  options?: FeedOptions
) => Promise<any>;

const feedPolicy: Record<string, FeedPolicyHandler | undefined> = {
  "default": randPolicy,
  "epsilon-greedy": undefined,
  "rand": randPolicy,
};

export default feedPolicy;

