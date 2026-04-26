# POST /api/exclusions

Create a new exclusion for an artist or track.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

---

## Request Body

| Field    | Type   | Required | Description                      |
| -------- | ------ | -------- | -------------------------------- |
| type     | string | yes      | `"artist"` or `"track"`          |
| targetId | string | yes      | ID of artist or track to exclude |

### Accepted ID aliases

You may also send one of:

- `artistId`
- `trackId`
- `id`
- `targetId`

---

## Response 201 Created

```json
{
  "id": "string",
  "name": "string",
  "excludedAt": "ISO string"
}
```

### Errors

| Status | Code         | Description                          |
| ------ | ------------ | ------------------------------------ |
| 400    | BAD_REQUEST  | Missing targetId                     |
| 404    | NOT_FOUND    | Artist not found in database         |
| 404    | NOT_FOUND    | Track not found in listening history |
| 401    | UNAUTHORIZED | Missing/invalid user                 |

### Notes

- Artist exclusions require the artist to exist in the local database.
- Track exclusions require the track to exist in the user's listening history.
