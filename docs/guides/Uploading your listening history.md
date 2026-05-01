# Upload Spotify extended listening history

Upload your Spotify extended listening history to populate Unwrap with your data.
This enables you to use the application to view customisable statistics based on your music listening data.

---

## Request extended streaming history from Spotify

Select the correct export before uploading data.

1. Open the Spotify Account Privacy page: https://www.spotify.com/account/privacy/
2. Scroll to **Download your data**.
3. Select **Extended streaming history**.
4. Select **Request data**.
5. Open your email and confirm the request.
6. Wait for Spotify to prepare the export.
7. Download the `.zip` file when ready.

You now have a ZIP file that contains your extended listening history.

---

## Upload the ZIP file

Send the following request:

``curl -X POST http://localhost:3000/api/history/spotify/upload -H "Cookie: accessToken=YOUR_TOKEN" -F "history=@C:\path\to\file\my_spotify_data.zip;type=application/zip" -F "platform=spotify"

Your listening history will now get processed and saved to the database.

---

## Verify uploaded data

Confirm that your data is available.

1. Send a request to `/api/top-artists` or `/api/top-tracks`.
2. Review the response.

You should see your listening statistics.

---

## Troubleshoot upload issues

- **"Spotify history folder not found":** This can happen if you upload the "Account Data" (the 5-day export) instead of the "Extended Streaming History". Ensure you requested the latter.
- **Malformed Data Error:** This usually indicates a JSON file was edited manually or truncated during the download. Try re-extracting the original ZIP from Spotify.
- **Rate Limit Delay:** If you see "Retrying in 30s" in the logs, it means the worker is being throttled by Spotify. No action is needed; the system will resume automatically.
