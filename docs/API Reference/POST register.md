## POST `/register`

Create a new user account.

### Authentication

Not required.

---

### Request Body

| Field       | Type   | Required | Description         |
| ----------- | ------ | -------- | ------------------- |
| email       | string | yes      | User email (unique) |
| displayName | string | yes      | Display name        |
| password    | string | yes      | Plain-text password |

---

### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "displayName": "string",
    "createdAt": "ISO string"
  }
}
```

### Errors

| Status | Code           | Description                        |
| ------ | -------------- | ---------------------------------- |
| 400    | BAD_REQUEST    | Missing required fields            |
| 409    | CONFLICT       | Email already exists               |
| 500    | INTERNAL_ERROR | Server or hashing/database failure |

### Notes

- Password is hashed using bcrypt before storage
- Email must be unique
- Response excludes sensitive fields (e.g., password hash)
