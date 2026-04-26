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

| Status | Code                 | Description                       |
| ------ | -------------------- | --------------------------------- |
| 401    | UNAUTHORIZED         | Missing/invalid user              |
| 400    | INVALID_UPLOAD       | Invalid ZIP or malformed data     |
| 400    | UNSUPPORTED_PLATFORM | Platform not supported            |
| 400    | NO_FILES_FOUND       | No file provided                  |
| 500    | INTERNAL_ERROR       | File processing or server failure |

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
