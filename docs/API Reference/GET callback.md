# GET /auth/callback

Handle Spotify OAuth callback and complete account connection.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

---

## Query Parameters

| Name  | Type   | Required | Description                |
| ----- | ------ | -------- | -------------------------- |
| code  | string | yes      | Spotify authorization code |
| state | string | yes      | OAuth state parameter      |

---

## Response 200 OK

```json
{
  "success": true,
  "message": "Spotify account connected successfully.",
  "platform": "spotify"
}
```

### Errors

| Status | Code              | Description                       |
| ------ | ----------------- | --------------------------------- |
| 400    | BAD_REQUEST       | Missing authorization code        |
| 401    | UNAUTHORIZED      | Missing user session              |
| 502    | SPOTIFY_API_ERROR | Failed to exchange code for token |
| 502    | SPOTIFY_API_ERROR | Spotify profile fetch failed      |
