import { spotifyUploadHandler } from "./platforms/spotify/upload-history/upload.service";
import { spotifyGetHistoryHandler } from "./platforms/spotify/get-history/getHistory.service";
export const uploadHandlers = {
  spotify: spotifyUploadHandler,
};

export const getHistoryHandlers = {
  spotify: spotifyGetHistoryHandler,
};
