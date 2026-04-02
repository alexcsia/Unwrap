import { http, HttpResponse } from "msw";

export const spotifyHandlers = [
  http.post("https://accounts.spotify.com/api/token", async ({ request }) => {
    return HttpResponse.json({
      access_token: "mock_access_token_123",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "mock_refresh_token_456",
    });
  }),

  http.get(
    "https://api.spotify.com/v1/me/player/recently-played",
    ({ request }) => {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit");

      return HttpResponse.json({
        items: [
          {
            track: {
              id: "mock_track_id",
              name: "Mock Song",
              artists: [{ name: "Mock Artist" }],
              album: { name: "Mock Album" },
              duration_ms: 210000,
            },
            played_at: new Date().toISOString(),
          },
        ],
        next: null,
        cursors: { after: "mock_cursor" },
        limit: limit,
        href: "https://api.spotify.com/v1/me/player/recently-played",
      });
    },
  ),
];
