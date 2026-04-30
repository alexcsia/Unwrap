# Tutorial: Authenticate with Spotify and fetch listening history

This tutorial guides you through the full flow of the system:
set up the app => register an account and authenticate => connect your Spotify account => fetch your listening history

---

## Prerequisites

- **Bun (v1.3.12 or above):** The primary runtime and package manager.
- **PostgreSQL:** Primary relational database.
- **Redis:** Required for BullMQ job queueing and metadata caching.
- **Spotify Developer Account:** To access the Web API.
- **Local environment set up**

---

## 1. Start the Backend

Run the API server:

```bash
bun run dev
```

The API should be available at:

http://localhost:3000

---

## 2. Start Supporting Services

### Start Redis (WSL)

```bash
sudo service redis-server start
```

Redis is required for background job processing (Spotify sync, ingestion, etc).
Start the worker service:

```bash
bun run dev:worker
```

---

### Ensure PostgreSQL is running

If using Docker:

```bash
docker start unwrap-db
```

## 3. Register an account and authenticate

First, create the account:

curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"email\": \"someuser@example.com\", \"displayName\": \"name\", \"password\": \"password\"}"

Then authenticate:

curl -i -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\": \"someuser@example.com\", \"password\": \"password\"}"

Make sure to store the accessToken cookie.

## 4. Connect Spotify Account (OAuth Flow)

### 4.1 Open OAuth endpoint in browser

Visit:

```
GET http://localhost:3000/auth/spotify
```

This will redirect you to Spotify’s login page.

---

### 4.2 Log in with Spotify

In the browser:

- Log in to your Spotify account
- Accept permissions (scopes like `user-read-recently-played`)

---

After approval, Spotify redirects you back to:

```
/api/auth/callback
```

At this point the backend:

- Exchanges authorization code for tokens
- Fetches your Spotify profile
- Stores tokens in the database under your `userId`

Your Spotify account is now linked to Unwrap.

---

You can confirm the connection exists in the database:

```ts
SELECT * FROM "ConnectedPlatforms"
WHERE "userId" = YOUR_USER_ID;
```

You should see:

- AccessToken
- RefreshToken
- platformUserId = your Spotify ID

---

## 6. Fetch your most recent tracks

Now that Spotify is connected, it is time to fetch your most recent listening history.

### Example request

```
curl -X GET http://localhost:3000/api/history/spotify/recent -H "Cookie: accessToken=YOUR_TOKEN"
```

## Response body:

```json
{
  "history": {
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 50,
      "hasMore": false,
      "nextOffset": null,
      "previousOffset": null
    },
    "history": [
      {
        "id": "string",
        "trackId": "string",
        "trackName": "string",
        "artistName": "string",
        "albumName": "string",
        "playedAt": "ISO string",
        "durationMs": 123456,
        "source": "string",
        "artists": [
          {
            "platformId": "string",
            "name": "string"
          }
        ]
      }
    ]
  }
}
```

## Next Steps

After completing this tutorial, you can explore:

- [How to use exclusions](../guides/Exclusions.md)
- [How to use the analytics endpoints](../guides/Analytics%20endpoints.md)
