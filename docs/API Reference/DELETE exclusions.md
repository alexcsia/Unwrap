# DELETE /api/exclusions

Remove an existing exclusion for an artist or track.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

---

## Query Parameters

| Name | Type   | Required | Description                |
| ---- | ------ | -------- | -------------------------- |
| type | string | yes      | `"artist"` or `"track"`    |
| id   | string | yes      | Target ID of the exclusion |

## Example request

```
curl -X DELETE http://localhost:3000/api/exclusions -H "Content-Type: application/json" -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" -d "{\"type\":\"artist\",\"targetId\":\"ARTIST_ID_HERE\"}"
```

## Response 204 No Content

No response body.

---

## Errors

| Status | Code         | Description                 |
| ------ | ------------ | --------------------------- |
| 404    | NOT_FOUND    | No matching exclusion found |
| 401    | UNAUTHORIZED | Missing/invalid user        |

---
