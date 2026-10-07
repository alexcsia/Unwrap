import type { Response, Request } from "express";
import { ApiError } from "@/errors/ApiError";

const API_KEY = process.env.LASTFM_API_KEY;
console.log("api key:", API_KEY);
const CLIENT_SECRET = process.env.LASTFM_SHARED_SECRET;
const REDIRECT_URI = process.env.LASTFM_CALLBACK_URI;

export const initiateOAuth = async (
  res: Response,
): Promise<{ redirectUrl: string }> => {
  const API_KEY = process.env.LASTFM_API_KEY;
  if (!API_KEY) {
    throw new ApiError(500, "DEFAULT", "Missing LASTFM_API_KEY");
  }
  return { redirectUrl: `http://www.last.fm/api/auth/?api_key=${API_KEY}` };
};

export const handleLastfmCallback = async (
  userId: string,
  query: Request["query"],
): Promise<{ success: boolean; message: string }> => {
  const authToken = query.token;

  if (!authToken || typeof authToken !== "string") {
    throw new ApiError(401, "UNAUTHENTICATED");
  }

  console.log("received token", authToken);

  const session = await createLastfmUserSession(authToken);

  console.log("received session:", session);

  return { success: true, message: "Last.fm connected" };
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

  console.log("String to hash:", sigString);
  console.log("Generated api_sig:", api_sig);

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
