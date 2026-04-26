## GET `/api/time-listened`

Retrieve aggregated listening time for the authenticated user.

### Authentication

Requires valid JWT (via `accessToken` cookie).

---

### Query Parameters

| Name   | Type   | Required | Description                    |
| ------ | ------ | -------- | ------------------------------ |
| year   | number | no       | Filter by year                 |
| month  | number | no       | Month (1–12). Requires `year`  |
| date   | string | no       | Specific date (`YYYY-MM-DD`)   |
| from   | string | no       | Start date (`YYYY-MM-DD`)      |
| to     | string | no       | End date (`YYYY-MM-DD`)        |
| limit  | number | no       | Ignored (kept for consistency) |
| offset | number | no       | Ignored (kept for consistency) |

---

### Validation Rules

- `month` requires `year`
- `from` and `to` must be provided together

---

### Response `200 OK`

```json
{
  "period": {
    "start": "ISO string",
    "end": "ISO string"
  },
  "statistics": {
    "totalMs": 123456789,
    "totalTracks": 150
  }
}
```

### Errors

| Status | Code           | Description          |
| ------ | -------------- | -------------------- |
| 401    | UNAUTHORIZED   | Missing/invalid user |
| 400    | BAD_REQUEST    | Invalid filters      |
| 500    | INTERNAL_ERROR | Server error         |

### Notes

- Returns total listening duration in milliseconds (totalMs)
- totalTracks counts all matching listening events
- Time range is normalized to full-day boundaries
- If no filters are provided, returns all-time data
