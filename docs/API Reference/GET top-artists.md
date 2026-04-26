## GET `/api/top-artists`

Retrieve a ranked list of the user’s most-played artists.

### Authentication

Requires valid JWT (via `accessToken` cookie).

---

### Query Parameters

| Name   | Type   | Required | Description                   |
| ------ | ------ | -------- | ----------------------------- |
| year   | number | no       | Filter by year                |
| month  | number | no       | Month (1–12). Requires `year` |
| date   | string | no       | Specific date (`YYYY-MM-DD`)  |
| from   | string | no       | Start date (`YYYY-MM-DD`)     |
| to     | string | no       | End date (`YYYY-MM-DD`)       |
| limit  | number | no       | Default: `10`                 |
| offset | number | no       | Default: `0`                  |

---

### Validation Rules

- `month` requires `year`
- `from` and `to` must be provided together

---

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
  "topArtists": [
    {
      "rank": 1,
      "artistId": "string",
      "artistName": "string",
      "playCount": 42,
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

```

```
