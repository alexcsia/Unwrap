# How to use analytics endpoints

This guide shows how to use the analytics endpoints of Unwrap.

## Prerequisites

- The Unwrap backend is running locally (see the [Setup Guide](../Getting%20started.md)).
- You have some test data or have uploaded your extended listening history to the database

## Ensure authentication

- Send a request to `/auth/login` with your credentials to obtain the access token.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
```

- The server will send a Set-Cookie header containing your JWT.
- Use the access token to send the request.

**Send authenticated request:**

```bash
curl -b "token=YOUR_JWT_HERE" http://localhost:3000/api/top-artists
```

---

## Choose time filters

Select query parameters to control which listening events are included.
Filters limit the time range before aggregation runs.

If you provide no filters, the endpoint uses best of all-time listening data.

**Available filters:**

| Filter           | Usage                | Example                                          |
| ---------------- | -------------------- | ------------------------------------------------ |
| `year`           | `?year=2025`         | `/api/top-artists?year=2025`                     |
| `year` + `month` | `?year=2025&month=3` | `/api/top-artists?year=2025&month=3`             |
| `date`           | `?date=2025-03-15`   | `/api/top-artists?date=2025-03-15`               |
| `from` + `to`    | Provide both         | `/api/top-artists?from=2025-01-01&to=2025-12-31` |
| none             | No parameters        | `/api/top-artists`                               |

**Validation rules:**

- Provide `year` when you use `month`.
- Provide both `from` and `to`.
- Use ISO format for dates (`YYYY-MM-DD`).

---

## Set pagination parameters

Control how many results the API returns.

- Use `limit` to define the number of items per request.
- Use `offset` to skip a number of items.

**Default values:**

- `limit = 10`
- `offset = 0`

**Example:**

```http
GET /api/top-artists?limit=10&offset=10
```

The API will return a subset of the ranked results.
Use pagination to request the next or previous subset.

---

**Examples:**

```bash
curl -X GET "http://localhost:3000/api/top-artists?limit=5" \
  -b "token=YOUR_JWT_HERE"
```

```bash
curl -X GET "http://localhost:3000/api/top-tracks?year=2025" \
  -b "token=YOUR_JWT_HERE"
```

---

## Use pagination metadata

Use the pagination object in the response to navigate results.

- Use `nextOffset` to request the next page.
- Use `previousOffset` to request the previous page.
- Stop when `hasMore` is `false`.

This way you can iterate through all available results without large payloads.

---

## Handle errors

| Status               | Action                  |
| -------------------- | ----------------------- |
| `401 UNAUTHORIZED`   | Log in again            |
| `400 BAD_REQUEST`    | Fix query parameters    |
| `500 INTERNAL ERROR` | Retry the request later |

---

## Next steps:

- See [API Reference](../API%20Reference/) to explore analytics endpoints
