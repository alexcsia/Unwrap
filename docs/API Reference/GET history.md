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

## Request example

```
curl -X GET http://localhost:3000/api/history/spotify/recent -H "Cookie: accessToken=YOUR_TOKEN"
```

## Response 200 OK

```json
{
  "history": {
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 50,
      "hasMore": false,
      "nextOffset": null,
      "previousOffset": null
    },
    "history": [
      {
        "id": "string",
        "trackId": "string",
        "trackName": "string",
        "artistName": "string",
        "albumName": "string",
        "playedAt": "ISO string",
        "durationMs": 123456,
        "source": "string",
        "artists": [
          {
            "platformId": "string",
            "name": "string"
          }
        ]
      }
    ]
  }
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
