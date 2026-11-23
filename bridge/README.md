# Tacoma Nights local broadcast bridge

## Install on the broadcast computer
1. Install Node.js 20 or newer.
2. Download this bridge folder from GitHub.
3. Copy `.env.example` to `.env`.
4. Set a random `BRIDGE_TOKEN` at least 32 characters long.
5. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same public project values used by `assets/js/config.js`.
6. Configure OBS WebSocket or Streamlabs Remote Control in the local-only settings.
7. Run `start-bridge.bat` on Windows, or `npm install && npm start` in this folder.

## Pair Broadcast Studio
Open the Studio on GitHub Pages or from a local static web server. Sign in with an existing Supabase account that owns the network program/schedule/queue records. Click Connect local bridge and enter the local `BRIDGE_TOKEN`. The browser sends the signed-in user's Supabase access token and refresh token to localhost; the bridge validates the access token with Supabase Auth and keeps both tokens in process memory only. The bridge refreshes its own session as it approaches expiry, so the Studio tab does not need to remain open for continuous playout. The browser-side Studio session does not auto-refresh to avoid racing the bridge's rotating refresh token; sign in again when you need to resume editing after the browser session expires. A bridge restart requires pairing again. The bridge uses that user's RLS permissions to read and update only their network rows. Neither token is committed to GitHub.

The local bridge must remain running for automatic playout. The Studio browser tab may close after pairing; the Node process continues polling the queue. Supabase access tokens expire; keep Studio open periodically so Supabase can refresh and re-pair the local bridge.

## Playout source
The bridge serves a local browser player at `http://127.0.0.1:8787/playout`. OBS automatically adds a browser source named **TN Network Playout** to the active scene when it connects. For Streamlabs Desktop, add a Browser Source to the scenes you plan to use with this URL, set it to 1920×1080, and enable audio. Keep the source visible in the scene. The same browser player works in either encoder.

The queue uses the existing `live_network_playout_queue` table. Only rows with `approved=true`, `status=queued` and a due (or empty) `scheduled_at` are eligible. The bridge claims the row as `playing`, plays it through the local browser source, then marks it `played` or `failed`. When a queue item is linked to a program, the program title and default duration are used. Direct media URLs are supported. For private Supabase Storage objects, set `media_url` to `storage://bucket/path/to/file.mp4`; the bridge creates a short-lived signed URL at playout time using the paired user session.

## Safety
The service binds to `127.0.0.1` by default. Keep it local; never expose this API or OBS/Streamlabs control ports to the internet. Never commit `.env`, OBS passwords, Streamlabs tokens, YouTube stream keys, or Supabase secret/service-role keys. The bridge never starts or stops the YouTube stream automatically; stream start/stop remains a deliberate producer action.
