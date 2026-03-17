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
    "https://api.spotify.com/v1/me/player/recently-played&limit=50",
    () => {
      return HttpResponse.json({
        item: { name: "Mock Song", artists: [{ name: "Mock Artist" }] },
        is_playing: true,
      });
    },
  ),
];
