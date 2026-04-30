# GET /api/exclusions

Retrieve all exclusions for the authenticated user.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

## Example request

```
curl -X GET http://localhost:3000/api/exclusions -H "Cookie: accessToken=YOUR_ACCESS_TOKEN"
```

## Response 200 OK

```json
{
  "exclusions": {
    "artists": [
      {
        "type": "artist",
        "artistId": "string",
        "artistName": "string",
        "excludedAt": "ISO string"
      }
    ],
    "tracks": [
      {
        "type": "track",
        "trackId": "string",
        "trackName": "string",
        "artistName": "string",
        "albumName": "string",
        "excludedAt": "ISO string"
      }
    ]
  }
}
```

### Errors

| Status | Code         | Description          |
| ------ | ------------ | -------------------- |
| 401    | UNAUTHORIZED | Missing/invalid user |

### Notes

- Results are grouped into artists and tracks.
