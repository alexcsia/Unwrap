# Unwrap

Unwrap is a multi-platform stats website. It aims to compete with Spotify Wrapped / Apple Music Replay / Soundcloud Playback by offering an alternative where users can see their combined statistics from all the different platforms they use. It offers customisability so that any statistic that doesn’t feel representative can be deleted.

`This project is for educational demonstration only. You may view and fork the code for reference, but you may not distribute, sublicense, or sell copies of this work without explicit permission.`

## Features

- Multi-platform support: Connect multiple music streaming accounts (Spotify, Apple Music, Last.fm, etc.) and see combined listening statistics.

- Unified stats: View top artists, tracks, genres, and listening trends across all your platforms in one place.

- Customizable statistics: Exclude specific artists, tracks, or genres that you feel don't represent your true listening habits.

- Date-range analysis: See your listening behaviour for any time period

## Prerequisites

Bun 1.3.9 (or above): The primary runtime and package manager.

PostgreSQL 15+ (or MySQL): A running database instance.

Spotify Developer Account

Node.js LTS (Optional but recommended): For maximum compatibility

## Installation and quick start

1. Register your project with Spotify

Before starting, create an app in the Spotify Developer Dashboard.

    Redirect URI: Set this to http://localhost:3000/api/auth/spotify/callback (or your local equivalent).

2. Clone the repository

   `git clone https://github.com/AvaHurstCode/Unwrap.git`

3. Install dependencies

```
cd Unwrap

bun install
```

4. Create a .env file and set the following environment variables:

```
DATABASE_URL
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_CALLBACK_URI
SESSION_SECRET
PORT
```

5. Start the backend

```
cd src
bun start app.ts
```
