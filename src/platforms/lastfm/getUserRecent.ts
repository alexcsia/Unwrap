import type { lastfmResponse } from "./types";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER_AGENT = process.env.LASTFM_USER_AGENT;

if (!LASTFM_USER_AGENT) {
  throw new Error("Lastfm user agent missing from env");
}

export const getUserRecentTracks = async (
  username: string,
  cursor: string | null,
): Promise<lastfmResponse> => {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&from=${cursor}&format=json`,

    {
      headers: {
        "User-Agent": LASTFM_USER_AGENT,
        Accept: "application/json",
      },
    },
  );
  const data = await res.json();
  return data;
};
