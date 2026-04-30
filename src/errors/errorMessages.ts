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
  BAD_REQUEST: "The request was invalid or cannot be processed",
  NOT_FOUND: "Requested resource not found",
  CACHE_LOCKED: "Cache locked by another process, please try again later",
  CONFLICT: "Email already in use",
  FORBIDDEN: "You do not have permission to perform this action",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
