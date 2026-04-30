## High-Level Project Overview: **Unwrap**

**Unwrap** is a music analytics engine designed to consolidate a user's listening history across multiple streaming platforms into a single, unified dashboard. While platforms like Spotify and Apple Music offer yearly "wrapped" summaries, Unwrap provides a permanent, cross-platform alternative that gives users total ownership and granular control over their musical data.

At its core, the project is a **Data Ingestion and Enrichment Pipeline**. It transforms raw, fragmented metadata from various sources into a clean, searchable, and relational database of musical trends.

---

### The Core Architecture

The project is built using a **Distributed Services** approach, separating the immediate user interface from the heavy-duty data processing.

#### The Multi-Platform Ingestion Layer

The system accepts data through two primary channels:

- **Live Sync:** Polling of APIs (like Spotify’s `getRecentlyPlayed`) to keep history up-to-date.
- **Historical Ingestion:** A file upload system that parses years of "Extended Streaming History" JSON exports.

#### The Background Processing Engine (BullMQ & Redis)

Because a single user’s history can contain hundreds of thousands of rows, Unwrap uses a **Job Queue** architecture. Instead of making the user wait for the database to process a file, the API immediately hands the task to a background worker.

- **Rate Limiting:** Ensures the app doesn't get banned by streaming APIs while fetching data.
- **Resilience:** Automatically retries failed tasks with exponential backoff.

#### The Metadata Enrichment Strategy

Raw data exports often lack unique identifiers (like Artist IDs). Unwrap implements an **Enrichment Logic** that:

1.  Saves tracks in a "Pending" state to provide instant visual feedback.
2.  Uses background workers to "hunt" for missing IDs via official APIs.
3.  Caches results in Redis to avoid redundant API calls for popular tracks.

---

### Technical Stack

| Component       | Technology              | Role                                                    |
| :-------------- | :---------------------- | :------------------------------------------------------ |
| **Runtime**     | **Bun**                 | High-performance JS engine and package manager.         |
| **Backend**     | **Express (TS)**        | The RESTful API layer.                                  |
| **Database**    | **PostgreSQL & Prisma** | Relational storage for tracks, artists, and users.      |
| **Queue/Cache** | **Redis & BullMQ**      | Handles background jobs and prevents API rate-limiting. |
| **Mocking**     | **MSW**                 | Simulates streaming APIs for local development          |

---
