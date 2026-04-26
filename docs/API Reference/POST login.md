# POST /auth/login

Authenticate a user and issue JWT access + refresh tokens.

## Authentication

Not required

---

## Request Body

| Field    | Type   | Required | Description        |
| -------- | ------ | -------- | ------------------ |
| email    | string | yes      | User email address |
| password | string | yes      | User password      |

---

## Success Response

### 200 OK

```json
{
  "message": "Successfully logged in"
}
```

## Cookies set

| Cookie       | Purpose        | Expiry     | Path                |
| ------------ | -------------- | ---------- | ------------------- |
| accessToken  | API access     | 15 minutes | `/`                 |
| refreshToken | Token rotation | 7 days     | `/api/auth/refresh` |

## Errors

| Status | Code            | Description                        |
| ------ | --------------- | ---------------------------------- |
| 400    | BAD_REQUEST     | Missing email or invalid input     |
| 401    | UNAUTHENTICATED | Invalid email or password mismatch |
