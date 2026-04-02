export const ERROR_MESSAGES = {
  INVALID_UPLOAD: "Uploaded file or folder is not valid",
  NO_FILES_FOUND: "Please select a file to upload",
  DB_ERROR: "Failed to save listening history",
  UNAUTHORIZED: "You are not authorized",
  UNAUTHENTICATED: "Authentication failed",
  DEFAULT: "Internal server error",
  MISSING_PLATFORM: "Platform parameter is missing",
  UNSUPPORTED_PLATFORM: "Unsupported platform",
  SPOTIFY_API_ERROR: "Error while fetching Spotify API",
  BAD_REQUEST: "Invalid token format",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
