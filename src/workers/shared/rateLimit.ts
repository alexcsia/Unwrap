import { redisCache } from "@/lib/redis";
import { Job } from "bullmq";

export const CACHE_TTL_SEC = 7 * 24 * 3600; // 7 days

const respectRateLimit = async (error: any, job: Job) => {
  const delay = error.retryAfter ? Number(error.retryAfter) * 1000 : 30_000;

  const until = Date.now() + delay;

  await redisCache.set("spotify:rate-limited-until", until, "PX", delay);

  console.warn(`[Job ${job.id}] Rate limited. Retrying in ${delay / 1000}s`);
  await job.moveToDelayed(until);
  return;
};

const checkRateLimited = async (job: Job) => {
  const waitUntil = await redisCache.get("spotify:rate-limited-until");
  if (waitUntil && Number(waitUntil) > Date.now()) {
    await job.moveToDelayed(Number(waitUntil));
    return true;
  } else return false;
};

export const rateLimits = {
  checkRateLimited,
  respectRateLimit,
  CACHE_TTL_SEC,
};
