# Unwrap

Unwrap is a multi-platform stats website. It aims to compete with Spotify Wrapped / Apple Music Replay / Soundcloud Playback by offering an alternative where users can see their combined statistics from all the different platforms they use. It offers customisability so that any statistic that doesn’t feel representative can be deleted.

## Features / Use cases

    Multi-platform support: Connect multiple music streaming accounts like Spotify, Apple Music, etc. and see combined listening statistics. (Currently only has support for Spotify)

    Authorization: Create an account and login securely via JWT

    Custom exclusion engine: Rule-based filtering to hide specific artists or tracks from aggregation.

    Flexible date filtering: Support for year, month, day, and custom range queries.

    High-volume processing: Background worker (BullMQ) capable of parsing thousands of history entries via ZIP uploads.

## Prerequisites

- **Bun** — used to run and build the project
- **Redis** — used for background job queues
- **PostgreSQL** — main relational database
- **WSL** (required for Redis on Windows) — provides a Linux environment

## Installation and quick start

1. Register your project with Spotify

Before starting, create an app in the Spotify Developer Dashboard.

    Redirect URI: Set this to http://localhost:3000/api/auth/spotify/callback

2. Clone the repository

   `git clone https://github.com/AvaHurstCode/Unwrap.git`

3. Install dependencies

```
cd Unwrap

bun install
```

4. Create a .env file and set the following environment variables:

```
DATABASE_URL="postgresql://postgres:admin@localhost:5432/unwrap"
SPOTIFY_CLIENT_ID = your-id
SPOTIFY_CLIENT_SECRET = your-secret
SPOTIFY_CALLBACK_URI= http://127.0.0.1:3000/auth/callback
PORT = 3000
NODE_ENV = development
MOCK_SPOTIFY = true
JWT_SECRET = your-secret
REDIS_URL=127.0.0.1:6379
```

5. Start the backend, databases and worker in dev mode

Make sure you have an instance of both Redis and Postgres running.

Initialize Prisma and sync your database schema:

```bash
bunx prisma generate
```

Apply migrations:

```bash
bunx prisma migrate dev --name init
```

Start redis:

```
sudo service redis-cli start
```

Start the app:

```
bun run dev
bun run dev:worker
```

## Documentation

- [Getting started](./docs/guides/Getting%20started.md)
- [Unwrap overview](./docs/conceptual/Unwrap%20explained.md)
- [Analytics guide](./docs/guides/Analytics%20endpoints.md)
- [Exclusions](./docs/conceptual/Customising%20analytics.md)
- [Contributor's guide](./Contributor%20guide.md)

` You may view and fork the code for reference, but you may not distribute, sublicense, or sell copies of this work without explicit permission.`
