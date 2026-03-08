import { fetchListeningHistory } from "./spotifyApi";
import { saveListeningHistory } from "@/models/history.model";

export const spotifyGetHistoryHandler = async (user: any) => {
  const history = await fetchListeningHistory(user);
  await Promise.all(
    history.map((item: any) =>
      saveListeningHistory(
        user.id,
        item.trackId,
        item.playedAt,
        item.trackName,
        item.artistName,
        item.albumName,
        item.durationMs,
        "get_recently_played",
        {},
      ),
    ),
  );
  return history;
};
