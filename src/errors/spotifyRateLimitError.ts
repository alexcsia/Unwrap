export class SpotifyRateLimitError extends Error {
  readonly statusCode = 429;
  readonly retryAfter: number;

  constructor(retryAfter?: number | string) {
    super("Spotify rate limit exceeded");
    this.name = "SpotifyRateLimitError";
    this.retryAfter = retryAfter ? Number(retryAfter) : 30;
  }
}
