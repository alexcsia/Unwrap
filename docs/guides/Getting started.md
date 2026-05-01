# Getting Started

This guide walks you through setting up the backend locally, including the database, Redis, Prisma, and background workers.

## Prerequisites

Make sure you have the following installed:

- **Bun** (latest version) — used to run and build the project
- **Docker** (optional but recommended for PostgreSQL) — easiest way to run a database
- **Redis** — used for background job queues
- **PostgreSQL** — main relational database
- **Prisma** — ORM used to interact with the database
- **WSL** (required for Redis on Windows) — provides a Linux environment

---

## 1. Install Dependencies

Install all required packages for the project:

```bash
bun install
```

---

## 2. Set Up PostgreSQL

Start a PostgreSQL database that the application can connect to.

### Option A — Using Docker

Runs a PostgreSQL container locally:

```bash
docker run --name unwrap-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=unwrap \
  -p 5432:5432 \
  -d postgres
```

### Option B — Local installation

Install PostgreSQL manually and create a database:

```sql
CREATE DATABASE unwrap;
```

---

## 3. Configure Environment Variables

Create a `.env` file to store configuration values used by the app:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/unwrap"

JWT_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_CALLBACK_URI=http://localhost:3000/api/auth/callback

REDIS_HOST=localhost
REDIS_PORT=6379
```

These values allow the app to connect to the database, Redis, and external APIs.

---

## 4. Set Up Prisma

Initialize Prisma and sync your database schema.

### Generate Prisma Client

Creates a typed client based on your schema:

```bash
bunx prisma generate
```

### Run Migrations

Applies schema changes to the database:

```bash
bunx prisma migrate dev --name init
```

This step creates tables and keeps your database in sync with your schema.

### (Optional) Seed Database

Populate the database with initial data:

```bash
bunx prisma db seed
```

---

## 5. Start Redis (via WSL)

```bash
sudo service redis-server start
```

Redis will run on:

```
localhost:6379
```

---

## 6. Run the Application (Development Mode)

Start the backend and worker processes.

### Start Backend Server

Runs the API server with live reload:

```bash
bun run dev
```

### Start Worker

Runs background job processing:

```bash
bun run dev:worker
```

You should now see:

- Server running (handles API requests)
- Worker running (processes queued jobs)

---

## 7. Verify Setup

Check that everything is working correctly.

Test a simple endpoint:

```http
GET http://localhost:3000/health
```

This confirms the server is running.

---

## 8. Build & Run (Production Mode)

Build and run the application as it would run in production.

### Build

Compiles the project into the `dist` folder:

```bash
bun run build
```

### Start both services

Runs the compiled backend:

```bash
bun run start
```

---

## Next Steps

- [Tutorial: Authenticate with Spotify and fetch your top-tracks](../docs//tutorials/Authenticate%20with%20Spotify%20and%20fetch%20top-tracks.md)
