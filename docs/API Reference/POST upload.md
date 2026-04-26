## POST `/api/history/upload`

Upload extended listening history for ingestion.

### Authentication

Requires valid JWT (via `accessToken` cookie).

---

### Request

- **Content-Type:** `multipart/form-data`
- **File:** `.zip` file containing platform export (e.g., Spotify Extended Streaming History)

### Requirements

| Field    | Type   | Required | Description                          |
| -------- | ------ | -------- | ------------------------------------ |
| file     | file   | yes      | ZIP archive with listening data      |
| platform | string | yes      | Platform identifier (e.g. `spotify`) |

---

### Response `200 OK`

```json
{
  "message": "Listening history uploaded successfully"
}
```

---

### Errors

### Auth errors

| Status | Code         | Description                       |
| ------ | ------------ | --------------------------------- |
| 401    | UNAUTHORIZED | User session not found or expired |

### Upload validation errors

| Status | Code                 | Description                                      |
| ------ | -------------------- | ------------------------------------------------ |
| 400    | UNSUPPORTED_PLATFORM | Platform not supported                           |
| 400    | INVALID_UPLOAD       | Spotify folder missing or invalid file structure |
| 400    | INVALID_UPLOAD       | Malformed JSON batch detected during validation  |

### Spotify / External API errors

| Status | Code              | Description                                    |
| ------ | ----------------- | ---------------------------------------------- |
| 502    | SPOTIFY_API_ERROR | Failed to fetch Spotify listening history      |
| 429    | SPOTIFY_API_ERROR | Rate limit exceeded (handled with retry delay) |

### Processing errors

| Status | Code           | Description                                                    |
| ------ | -------------- | -------------------------------------------------------------- |
| 500    | INTERNAL_ERROR | File system failure, queue failure, or unexpected worker crash |

---

### Notes

- Upload must contain **extended streaming history**, not summary data
- ZIP is extracted and processed server-side
- Data is validated before ingestion (schema validation)
- Tracks are processed in **batches** and sent to a background queue
- Artist metadata may be enriched asynchronously after upload
- Temporary files are deleted after processing

```

```
