# OAuth Authentication (Spotify Integration)

The OAuth system enables users to securely connect their Spotify account to the application without sharing their password. Instead of storing credentials, the system stores temporary access tokens that can be refreshed and used to act on behalf of the user.

## Overview

The authentication flow is based on the **OAuth 2.0 Authorization Code Flow**. It allows the application to request permission from Spotify, obtain an access token, and store it for future API requests.

Once a user connects their account, their Spotify credentials are never stored. Instead, only **access tokens and refresh tokens** are persisted in the database.

These tokens are linked to the internal `userId`, which allows the backend to retrieve and use them whenever Spotify API calls are required.

---

## OAuth Flow Steps

The authentication process follows these steps:

### 1. User initiates connection

The user clicks “Connect Spotify”, which redirects them to Spotify’s authorization page.

The request includes:

- Client ID
- Requested scopes (e.g. `user-read-email`, `user-read-recently-played`)
- Redirect URI
- Random state string (for CSRF protection)

```http
GET /api/auth/spotify
```

This redirects the user to Spotify’s login and consent screen.

---

### 2. User authorizes access

Spotify prompts the user to approve access to their account.

If approved, Spotify redirects the user back to the application’s callback URL:

```http
GET /api/auth/callback?code=AUTH_CODE&state=STATE
```

The `code` is a temporary authorization code used to request tokens.

---

### 3. Exchange authorization code for tokens

The backend exchanges the authorization code for:

- Access token
- Refresh token
- Expiration time

This is done via:

```http
POST https://accounts.spotify.com/api/token
```

with:

- `grant_type=authorization_code`
- `code`
- `redirect_uri`
- Basic authentication header (client_id + client_secret)

---

### 4. Persist tokens in database

The tokens are stored in the `ConnectedPlatforms` table:

- `AccessToken`
- `RefreshToken`
- `expiresAt`
- `platformUserId` (Spotify user ID)
- `userId` (internal application user)

If a connection already exists, it is **updated** instead of duplicated.

## Token Usage in the Application

Whenever the backend needs to access Spotify data:

1. The request includes the internal `userId`
2. The database is queried:

```ts
const connection = await prisma.connectedPlatforms.findUnique({
  where: {
    userId_platformName: {
      userId,
      platformName: "spotify",
    },
  },
});
```

3. The stored access token is used to authenticate Spotify API requests

```http
Authorization: Bearer ACCESS_TOKEN
```

## Token Refresh Strategy

Access tokens expire after a short period. When expired:

- The refresh token is used to request a new access token
- The database is updated with the new token values
- The operation is retried automatically

This ensures continuous access without requiring user re-login.

---

## See also:

-[ Authenticate with Spotify and fetch your top-tracks](../tutorials/Authenticate%20with%20Spotify%20and%20fetch%20top-tracks.md)
