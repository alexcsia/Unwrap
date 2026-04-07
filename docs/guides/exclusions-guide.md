# How to Customise Your Statistics with Exclusions

This guide shows you how to use the Unwrap API to exclude artists, tracks, or genres from your aggregated statistics. By adding exclusions, you can remove listening events that don't represent your true taste – for example, a track played by accident or an artist you no longer enjoy.

## Prerequisites

- The Unwrap backend is running locally (see the [Setup Guide](./setup.md)).
- You have a valid user session. The instructions below assume you are already authenticated with a music streaming platform (e.g., via Spotify OAuth).

## Step‑by‑Step Instructions

### 1. Add an Exclusion (Artist or Track)

To mark a statistic as excluded, send a `POST` request to `/api/exclusions` with a JSON body identifying the entity you want to exclude.

- **Endpoint:** `POST /api/exclusions`
- **Authentication:** Required

#### Example: Excluding an Artist

```json
{
  "type": "artist",
  "artistId": "spotify:artist:123"
}
```

#### Example: Excluding a Track

```json
{
  "type": "track",
  "trackId": "spotify:track:123"
}
```

**Response** (success):

```json
{
  "id": "excl_123456",
  "excludedAt": "2024-02-27T10:30:00Z"
}
```

The `id` is a unique identifier for this exclusion, and `excludedAt` is the timestamp when it was created.

### 2. List All Your Exclusions

To see a complete list of everything you have excluded, send a `GET` request to `/api/exclusions`.

- **Endpoint:** `GET /api/exclusions`
- **Authentication:** Required

**Response**:

```json
{
  "exclusions": {
    "artists": [
      {
        "type": "artist",
        "artistId": "spotify:artist:123",
        "artistName": "Taylor Swift",
        "excludedAt": "2024-02-27T10:30:00Z"
      }
    ],
    "tracks": [
      {
        "type": "track",
        "trackId": "spotify:track:456",
        "trackName": "Cruel Summer",
        "artistName": "Taylor Swift",
        "albumName": "Lover",
        "excludedAt": "2024-02-27T10:35:00Z"
      }
    ]
  }
}
```

The response groups exclusions by type, making it easy to review and manage them.

### 3. Remove an Exclusion

If you change your mind and want a previously excluded entity to appear in your statistics again, you can delete the exclusion.

- **Endpoint:** `DELETE /api/exclusions`
- **Authentication:** Required
- **Query Parameters:** `type` (artist/track) and `id` (the platform‑specific ID)

#### Example: Removing an Artist Exclusion

```
DELETE /api/exclusions?type=artist&id=spotify:artist:123
```

**Response:** `200 OK` with no body.

After successful deletion, the artist or track will be included in all future statistical queries.

---

## Troubleshooting

- **Authentication errors (401)**: Make sure you are logged in. If using a tool like `curl`, you may need to copy the access token after logging in and include it with the `-H` flag.
- **Invalid request body**: Double‑check that the JSON is properly formatted and contains all required fields (see examples above).
- **Exclusion not appearing in list**: Verify that you used the correct platform‑specific ID (e.g. `spotify:artist:123`). The ID must match exactly how it is stored in your listening history.

---

## Next Steps

- Learn how exclusions affect your statistics in the [Concept Guide: User Customisation](../conceptual/user-customisation.md).
- Explore the full API in the [API Reference](./api-reference/exclusions.md).
