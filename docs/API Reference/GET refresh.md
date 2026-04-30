# GET /auth/refresh

Rotate refresh tokens and issue new access credentials.

## Authentication

Requires a `refreshToken` cookie.

---

## Request

No body required.

Uses cookie:

| Cookie       | Required | Description                                       |
| ------------ | -------- | ------------------------------------------------- |
| refreshToken | yes      | Current refresh token in format `sessionId.token` |

---

## Request example

```
curl -i -X GET http://localhost:3000/auth/refresh -H "Cookie: refreshToken=YOUR_COOKIE"
```

## Response 200 OK

```json
{
  "message": "Tokens refreshed successfully"
}
```

## Cookies set

### accessToken

| Property | Value           |
| -------- | --------------- |
| httpOnly | true            |
| secure   | production only |
| sameSite | lax             |
| path     | /               |
| maxAge   | 15 minutes      |

### refreshToken

| Property | Value             |
| -------- | ----------------- |
| httpOnly | true              |
| secure   | production only   |
| sameSite | strict            |
| path     | /api/auth/refresh |
| maxAge   | 7 days            |

## Errors

| Status | Code            | Description                     |
| ------ | --------------- | ------------------------------- |
| 400    | BAD_REQUEST     | Invalid refresh token format    |
| 401    | UNAUTHENTICATED | Missing refresh token           |
| 401    | UNAUTHENTICATED | Session expired                 |
| 401    | UNAUTHENTICATED | Invalid token                   |
| 500    | INTERNAL_ERROR  | Transaction or database failure |
