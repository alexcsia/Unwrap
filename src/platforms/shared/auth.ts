import { randomBytes } from "crypto";
import { redisCache } from "@/lib/redis";

export const STATE_TTL_SECONDS = 10 * 60; // 10 min

const keyFor = (state: string): string => `oauth:state:${state}`;

export const createOAuthState = async (
  userId: string,
  platform: string,
): Promise<string> => {
  const state = randomBytes(32).toString("hex");
  await redisCache.set(
    keyFor(state),
    JSON.stringify({ userId, platform }),
    "EX",
    STATE_TTL_SECONDS,
  );
  return state;
};

export const consumeOAuthState = async (
  userId: string,
  platform: string,
  state: string,
): Promise<boolean> => {
  const raw = await redisCache.getdel(keyFor(state));
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as { userId: string; platform: string };
    return parsed.userId === userId && parsed.platform === platform;
  } catch {
    return false;
  }
};
