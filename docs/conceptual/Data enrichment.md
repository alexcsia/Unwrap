## The Need for Data Enrichment in the case of Spotify

When users export their **Spotify Extended Streaming History**, the data provided is incomplete. Specifically, the JSON files include the artist's name but **omitting unique Artist IDs**.

This creates a significant challenge for data accuracy: Spotify typically only lists the "main" artist associated with the album that the track belongs to. However, a single track can have multiple featured artists or collaborators. By only saving the text-based name provided in the export, we risk losing the rich relationships between tracks and all involved creators.

To solve this, we implement a background enrichment process. We take the track information we do have, fetch the complete track object from the Spotify API, and extract the unique IDs for **every artist involved** in the track. This ensures our database correctly attributes plays to every collaborator and maintains unique records that aren't confused by naming variations or duplicate artist names.

## Implementing the "Pending" State Sync

During the file upload/parsing phase, we generate a temporary `platformId`. We prefix it with `pending:` so the worker knows exactly which records need updates later.

To prevent redundant API calls (e.g.: a user listened to the same song several times), the worker caches the artist IDs for a given track. If multiple workers process the same track, only one will fetch from Spotify and then cache the new data; the others wait/retry.

If calling the Spotify API fails for non-rate-limiting reasons, the worker logs a warning and proceeds to save the **Pending** version anyway to ensure no user data is lost.

- If Real ID is found: The play is linked to a permanent Artist record.
- If remaining as Pending: The play is stored with the `pending:ArtistName` ID, identifying the record as "needs update."
