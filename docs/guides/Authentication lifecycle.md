# Authentication lifecycle guide

This guide walks you through the full authentication flow in Unwrap.

Authentication is **cookie-based**, meaning tokens are stored as cookies and must be sent with each request.

## Prerequisites

- The backend is running locally
- You have a valid user account

## 1. Log in

Authenticate with your email and password.

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"yourpassword\"}"
```

- Server validates credentials and will issue:
  - `accessToken` (short-lived)
  - `refreshToken` (long-lived)

- Both are returned as **Set-Cookie headers**

You must copy these cookies manually if using curl.

## 2. Use the access token

Call protected endpoints by sending the `accessToken` cookie.

```bash
curl -X GET http://localhost:3000/api/top-artists \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN"
```

- Server will reads the `accessToken`, authenticate the request and return protected data.

## 4. Refresh Tokens

Access tokens expire quickly.
When that happens, requests will fail with:

```json
{
  "error": "UNAUTHORIZED"
}
```

Use the `refreshToken` to obtain a new access token.

```bash
curl -i -X POST http://localhost:3000/auth/refresh \
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

### What happens

- Server will validate the refresh token and issue:
  - new access token
  - new refresh token

You must again copy the new cookies from the response.

## 5. Retry the request

After refreshing, use the new access token:

```bash
curl -X GET http://localhost:3000/api/top-artists \
  -H "Cookie: accessToken=NEW_ACCESS_TOKEN"
```

## 6. Log out

You invalidate the session by calling this endpoint:

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN"
```

### What happens

- The cookies are invalidated and further requests will return `401`.

## Common Mistakes

### Forgetting to send cookies

If you don’t include:

```bash
-H "Cookie: accessToken=..."
```

the request will be unauthenticated and rejected.

### Using the wrong cookie for refresh endpoint

- `/auth/refresh` requires **refreshToken**, not accessToken

---

### Not updating tokens after refresh

Refresh tokens are **rotated**, meaning the old one becomes invalid.

## Next Steps

- See [API Reference](../API%20Reference/) for authentication endpoints
- [Analytics endpoints](./Analytics%20endpoints.md)
