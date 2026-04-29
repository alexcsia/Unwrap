This document explains how **Unwrap** handles large-scale data ingestion from Spotify’s "Extended Streaming History."

---

## Understanding the Data Ingestion Pipeline

When a user provides their listening history, they aren't just uploading a single file; they are providing a compressed archive usually containing years of musical biography. Processing this data requires a balance between **immediate system responsiveness** and **long-term data integrity**.

### 1. The Multi-Stage Lifecycle

The ingestion process is divided into three distinct phases to ensure the application remains fast and stable:

| Phase                       | Responsibility                                                     | Context               |
| :-------------------------- | :----------------------------------------------------------------- | :-------------------- |
| **Phase 1: Extraction**     | Validating the ZIP structure and cleaning up temporary disk space. | Synchronous (API)     |
| **Phase 2: Transformation** | Normalizing raw JSON into a standard internal schema and batching. | Synchronous (API)     |
| **Phase 3: Enrichment**     | Resolving metadata (Artist IDs) and committing to the database.    | Asynchronous (Worker) |

---

## Key Architectural Concepts

### Zip & File Handling

The system uses a **temporary extraction strategy**.

1. The uploaded ZIP is unpacked into a unique temporary directory.
2. The system specifically targets the `Spotify Extended Streaming History` folder.
3. No matter what happens (success or crash), the raw ZIP and the extracted folders are then deleted from the server.

### Batch Processing

Processing 50,000+ tracks one by one in a single request would crash the event loop or time out the user's connection. Instead, we use **Batched Ingestion**:

- **Memory Management:** Raw JSON is read and immediately chunked into batches of **1,000**.
- **Zod Validation:** Each batch is validated against a strict schema. If a file is corrupted halfway through, the system catches it before it hits the database.

### The "AddBulk" Strategy

Rather than awaiting a database write for every track, the `spotifyParser` transforms the data and pushes it into a **Redis-backed queue** (BullMQ).

- This offloads the "heavy lifting" to background workers.
- The API can return a "Success" message to the user in seconds, even if the actual synchronization takes several minutes to complete in the background.

---

## Transformation Logic

During the `processSpotifyEntries` stage, data is converted from Spotify's specific export format to our internal `ListeningHistoryDTO`.

| Raw Spotify Field                 | Internal Field        | Transformation Logic                                      |
| :-------------------------------- | :-------------------- | :-------------------------------------------------------- |
| `spotify_track_uri`               | `platformTrackId`     | Strips the `spotify:track:` prefix to store only the ID.  |
| `ts`                              | `playedAt`            | Converted to a standard JS Date object.                   |
| `master_metadata_...`             | `trackName/albumName` | Mapped to clean fields; defaults to "Unknown" if missing. |
| `master_metadata_..._artist_name` | `artists`             | Wrapped in a **"Pending"** state (e.g., `pending:Drake`). |

---

## Fault Tolerance & Reliability

### Exponential Backoff

Since the worker needs to communicate with the Spotify API for enrichment, it is susceptible to network flickers or rate limits.

- We configure **3 attempts** per track.
- If a track fails, it waits **2 seconds**, then **4 seconds**, then **8 seconds** before giving up.

### Atomic Jobs

By treating each track as an individual job in the queue:

1. One malformed track won't stop the other 4,999 from being processed.
2. We can track exactly which tracks failed and why via the `removeOnFail` log retention.

## Summary of System Flow

1. **User** uploads a ZIP file.
2. **Server** extracts files => Reads JSON => Validates 1,000 tracks at a time.
3. **Queue** receives a "Bulk Add" of jobs.
4. **Worker** picks up jobs => Enrichment (Spotify API) => Final DB Save.
5. **Cleanup** removes all traces of the raw files from the server disk.
