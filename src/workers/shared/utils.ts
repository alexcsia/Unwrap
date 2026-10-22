import { redisCache } from "@/lib/redis";

export const checkCachedMbid = async (mbid: string) => {
  const cached = await redisCache.get(isrcCacheKey(mbid));
  return cached === null;
};

export const isrcCacheKey = (mbid: string) => `mb:recording:${mbid}:isrcs`;
