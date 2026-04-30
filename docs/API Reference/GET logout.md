# POST /auth/logout

Logout the authenticated user and invalidate their session.

---

## Authentication

Requires valid JWT (via `accessToken` cookie).

---

## Request

No request body required.

## Request example

```
 curl -X POST http://localhost:3000/auth/logout -H "Cookie: accessToken=YOUR_TOKEN"

```

## Success Response

### 200 OK

No response body

---

## Side Effects

- Deletes server-side refresh token session

| Cookie       | Action  |
| ------------ | ------- |
| accessToken  | cleared |
| refreshToken | cleared |

---

## Errors

| Status | Code         | Description            |
| ------ | ------------ | ---------------------- |
| 401    | UNAUTHORIZED | No active user session |

---

## Notes

- Cookies are cleared even if already invalid
