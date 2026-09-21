import { redisCache } from "../queue";

export const getRateLimitWait = async (): Promise<number | null> => {
  const waitUntil = await redisCache.get("spotify:rate-limited-until");

  if (!waitUntil) {
    return null;
  }

  const remaining = Number(waitUntil) - Date.now();

  return remaining > 0 ? remaining : null;
};
