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

---

## Response 204 No Content

No response body.

---

## Errors

| Status | Code         | Description                 |
| ------ | ------------ | --------------------------- |
| 404    | NOT_FOUND    | No matching exclusion found |
| 401    | UNAUTHORIZED | Missing/invalid user        |

---
