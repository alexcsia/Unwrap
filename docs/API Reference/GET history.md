# GET /api/history/spotify/recent

Retrieve recent listening history for the authenticated user from a connected streaming platform.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

---

## Query Parameters

| Name     | Type   | Required | Description                         |
| -------- | ------ | -------- | ----------------------------------- |
| platform | string | yes      | Streaming platform (e.g. `spotify`) |

---

## Response 200 OK

```json
{
  "history": [
    {
      "id": "string",
      "trackId": "string",
      "trackName": "string",
      "artistName": "string",
      "albumName": "string",
      "playedAt": "ISO string",
      "durationMs": 123456,
      "source": "string"
    }
  ]
}
```

---

## Errors

| Status | Code              | Description                               |
| ------ | ----------------- | ----------------------------------------- |
| 401    | UNAUTHORIZED      | User session not found or expired         |
| 404    | NOT_FOUND         | No Spotify connection found               |
| 502    | SPOTIFY_API_ERROR | Failed to fetch Spotify listening history |

---

## Notes

- Fetches up to **50 most recent tracks** from Spotify.
- Automatically refreshes expired Spotify access tokens.
