## GET `/api/top-tracks`

Retrieve a ranked list of the user’s most-played tracks.

### Authentication

Requires valid JWT (via `accessToken` cookie).

---

### Query Parameters

| Name   | Type   | Required | Description                  |
| ------ | ------ | -------- | ---------------------------- |
| year   | number | no       | Filter by year               |
| month  | number | no       | Month (1–12)                 |
| date   | string | no       | Specific date (`YYYY-MM-DD`) |
| from   | string | no       | Start date (`YYYY-MM-DD`)    |
| to     | string | no       | End date (`YYYY-MM-DD`)      |
| limit  | number | no       | Default: `10`                |
| offset | number | no       | Default: `0`                 |

### Example request

```
curl -i -X GET http://localhost:3000/api/top-tracks -H "Cookie: accessToken=YOUR_TOKEN"

```

### Response `200 OK`

```json
{
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 100,
    "hasMore": true,
    "nextOffset": 10,
    "previousOffset": null
  },
  "topTracks": [
    {
      "rank": 1,
      "trackId": "string",
      "trackName": "string",
      "artistName": "string",
      "albumName": "string",
      "plays": 42,
      "durationMs": 123456,
      "source": "string",
      "uploadedAt": "ISO string"
    }
  ]
}
```

### Errors

| Status | Code           | Description          |
| ------ | -------------- | -------------------- |
| 401    | UNAUTHORIZED   | Missing/invalid user |
| 400    | BAD_REQUEST    | Invalid filters      |
| 500    | INTERNAL_ERROR | Server error         |

---

### Notes

- Results are sorted by play count (descending)
- Excluded tracks/artists are automatically filtered out
- Pagination is offset-based
