import { spotifyUploadHandler } from "./platforms/spotify/upload-history/spotifyUpload.service";
import { spotifyGetHistoryHandler } from "./platforms/spotify/get-history/spotifyGetHistory.service";
export const uploadHandlers = {
  spotify: spotifyUploadHandler,
};

export const getHistoryHandlers = {
  spotify: spotifyGetHistoryHandler,
};
