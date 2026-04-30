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

### Request example

```
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"email\": \"someuser@example.com\", \"displayName\": \"name\", \"password\": \"password\"}"
```

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

- Email must be unique
