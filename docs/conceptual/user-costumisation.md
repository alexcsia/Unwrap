# User Customisation & Stat Deletion

The primary feature of Unwrap is allowing users to customise their statistics by excluding specific artists or tracks. This provides the user with the opportunity to gain a deeper understanding of their music streaming behaviours from different angles.

## Overview

The exclusion system is built on a **soft delete** model that gives the user the opportunity to determine which entities should be filtered out during statistical computation. Each exclusion is the result of a user flagging an entity for exclusion. Entitites (artist or track) are identified by their platform‑specific IDs.

When generating statistics – whether for a global overview or a specific date range – the system filters out any listening events that match an active exclusion before performing aggregation.

### Exclusion Types

The system supports two types of exclusions, each with a different scope:

- **Artist exclusions**: Exclude all listening events where the track's artist matches the given artist ID. This removes every play by that artist from all statistics (top artists, top tracks, genre distributions, etc.).

- **Track exclusions**: Exclude only the specific track identified by the track ID. Other tracks by the same artist remain visible.

Each exclusion record contains the user ID, exclusion type, entity ID, an optional display name (for UI purposes), and a timestamp indicating when the exclusion was created.

### Impact on Statistics

All statistical queries, including date‑range queries like "top 5 artists in June 2020", apply exclusions as a filtering step before aggregation. Here is the process:

1. Retrieves the user's listening history from the database.
2. Filters the listening history to include only events whose artist or track are **not** excluded and fit the requested date range.
3. Performs the requested aggregation (counts, rankings, averages) on the filtered dataset.

Exclusions are applied consistently across all time ranges. If a user excludes an artist today, that artist's plays from previous years are also excluded from historical date‑range queries.

When an exclusion is removed, the previously hidden enitites immediately reappear in all affected statistics.

## Additional Resources

- [API Reference: Exclusions Endpoints](../guides/exclusions-guide.md) – Detailed documentation for `POST /api/exclusions`, `DELETE /api/exclusions`, and `GET /api/exclusions`
