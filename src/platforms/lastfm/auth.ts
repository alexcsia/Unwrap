import type { Response, Request } from "express";
import { ApiError } from "@/errors/ApiError";
import prisma from "@/utils/prisma.util";
import { pollQueue } from "@/lib/queue";
import { disconnectUser } from "@/models/connectedPlatforms";

export const initiateOAuth = async (
  res: Response,
): Promise<{ redirectUrl: string }> => {
  const API_KEY = process.env.LASTFM_API_KEY;
  if (!API_KEY) {
    throw new ApiError(500, "DEFAULT", "Missing LASTFM_API_KEY");
  }
  return { redirectUrl: `https://www.last.fm/api/auth/?api_key=${API_KEY}` };
};

export const handleLastfmCallback = async (
  userId: string,
  query: Request["query"],
): Promise<void> => {
  const authToken = query.token;

  if (!authToken || typeof authToken !== "string") {
    throw new ApiError(401, "UNAUTHENTICATED");
  }

  const session = await createLastfmUserSession(authToken);

  await saveLastfmSession(session, userId);

  const intervalMs =
    process.env.NODE_ENV === "production" ? 30 * 60 * 1000 : 60 * 1000;

  await pollQueue.add(
    `poll:${userId}`,
    { userId: userId, platform: "lastfm" },
    {
      // repeat: { every: 30 * 60 * 1000 }, //30 min
      repeat: { every: intervalMs },
      jobId: `poll:${userId}:lastfm`, // deduplicates, safe to call on reconnect
      // delay: Math.floor(Math.random() * 30 * 60 * 1000), // random offset within 30 min window
      removeOnComplete: true,
      removeOnFail: { count: 100 },
    },
  );
};

export type LastfmSession = {
  name: string;
  key: string;
};
export const saveLastfmSession = async (
  session: LastfmSession,
  userId: string,
) => {
  await prisma.connectedPlatforms.upsert({
    where: {
      userId_platformName: {
        userId: userId,
        platformName: "lastfm",
      },
    },
    update: {
      platformUsername: session.name,
      sessionKey: session.key,
    },
    create: {
      userId: userId,
      platformName: "lastfm",
      platformUsername: session.name,
      sessionKey: session.key,
    },
  });
};

export const createLastfmUserSession = async (token: string) => {
  const API_KEY = process.env.LASTFM_API_KEY;
  const SECRET = process.env.LASTFM_SHARED_SECRET;

  if (!API_KEY || !SECRET) {
    throw new Error(
      "Missing LASTFM_API_KEY or LASTFM_SHARED_SECRET in environment variables",
    );
  }

  const sigString = `api_key${API_KEY}methodauth.getSessiontoken${token}${SECRET}`;

  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(sigString);
  const api_sig = hasher.digest("hex").toLowerCase();

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&token=${token}&api_key=${API_KEY}&api_sig=${api_sig}&format=json`,
    {
      headers: {
        "User-Agent": "UnwrapApp/1.0.0 ( dev@example.com )",
      },
    },
  );

  const data = await res.json();

  if (data.error) {
    throw new Error(`Last.fm API Error ${data.error}: ${data.message}`);
  }

  return data.session;
};

export const disconnectLastfm = async (userId: string): Promise<void> => {
  try {
    await disconnectUser(userId, "lastfm");
  } catch (err: any) {
    throw new ApiError(
      500,
      "DEFAULT",
      `Could not delete user spotify tokens: ${err}`,
    );
  }
};
