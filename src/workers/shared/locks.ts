import { redisCache } from "@/lib/queue";

export const acquireEnrichmentLock = async (lockKey: string) => {
  return redisCache.set(lockKey, "1", "EX", 30, "NX");
};
