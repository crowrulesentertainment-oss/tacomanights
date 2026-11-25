# Tacoma Nights local broadcast bridge

## Install on the broadcast computer
1. Install Node.js 20 or newer.
2. Download and extract the **entire tacomanights repository ZIP**. Do not download only the `bridge` folder. The `studio`, `assets`, and `network` folders must remain alongside `bridge` in the extracted project root.
3. Copy `.env.example` to `.env`.
4. Set a random `BRIDGE_TOKEN` at least 32 characters long.
5. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same public project values used by `assets/js/config.js`.
6. Configure OBS WebSocket or Streamlabs Remote Control in the local-only settings.
7. Run `start-bridge.bat` on Windows, or `npm install && npm start` in this folder.

## Pair Broadcast Studio
With the bridge running from `<extracted-project-folder>/bridge`, open **http://127.0.0.1:8787/studio/** on the broadcast computer. The expected folder layout is `tacomanights/bridge`, `tacomanights/studio/index.html`, `tacomanights/assets/`, and `tacomanights/network/`. If you see `Cannot GET /studio/`, the bridge cannot find the sibling `studio` folder—re-extract the full repository ZIP and run `npm start` from its `bridge` folder. The bridge serves the Studio and its assets locally, avoiding browser local-network permission/CORS issues. Sign in with an existing Supabase account that owns the network program/schedule/queue records. You can also use the GitHub Pages Studio if your browser permits the page to access localhost. Click Connect local bridge and enter the local `BRIDGE_TOKEN`. The browser sends the signed-in user's Supabase access token and refresh token to localhost; the bridge validates the access token with Supabase Auth and keeps both tokens in process memory only. The bridge refreshes its own session as it approaches expiry, so the Studio tab does not need to remain open for continuous playout. The browser-side Studio session does not auto-refresh to avoid racing the bridge's rotating refresh token; sign in again when you need to resume editing after the browser session expires. A bridge restart requires pairing again. The bridge uses that user's RLS permissions to read and update only their network rows. Neither token is committed to GitHub.

The local bridge must remain running for automatic playout. The Studio browser tab may close after pairing; the Node process continues polling the queue. Supabase access tokens expire; keep Studio open periodically so Supabase can refresh and re-pair the local bridge.

## Playout source
The bridge serves a local browser player at `http://127.0.0.1:8787/playout`. OBS automatically adds a browser source named **TN Network Playout** to the active scene when it connects. For Streamlabs Desktop, add a Browser Source to the scenes you plan to use with this URL, set it to 1920×1080, and enable audio. Keep the source visible in the scene. The same browser player works in either encoder.

The queue uses the existing `live_network_playout_queue` table. Only rows with `approved=true` and `status=queued` are eligible. A queue item linked to a program with an empty `scheduled_at` waits for that program's active schedule window. Items with a scheduled timestamp play when that time arrives; an unlinked item added without a time is set to play immediately. The bridge claims the row as `playing`, plays it through the local browser source, then marks it `played` or `failed`. When a queue item is linked to a program, the program title and default duration are used. Direct media URLs and public YouTube playlists are supported. Paste a YouTube playlist URL in Media & Playout; Studio stores it as a playlist queue item and the local player uses YouTube's embedded player to play the playlist in order. The queue advances only when the final playlist video ends. Playlist playback requires internet access and an embeddable/public playlist; videos with embedding restrictions or regional/age restrictions may not play. A playlist is treated as a single queue item, so set an optional duration only if you intentionally want to cap it. For private Supabase Storage objects, set `media_url` to `storage://bucket/path/to/file.mp4`; the bridge creates a short-lived signed URL at playout time using the paired user session.

## Hybrid 24/7 broadcast operation

Tacoma Nights supports one continuous YouTube livestream with two producer-controlled operating modes:

- **AUTOMATION** (default): the Node scheduler checks the existing Supabase schedule and approved playout queue. Eligible media and YouTube playlists are sent to the local TN Network Playout browser source. Queue entries are marked played or failed as playback finishes.
- **LIVE EVENT**: Master Control pauses automatic queue playback. If an item is currently playing, its queue status is returned to queued so it can resume later. The producer switches OBS/Streamlabs to a separate live scene and runs the live show. The bridge and Supabase scheduler remain available.
- **Resume automation**: the producer returns to Master Control and selects Resume automated programming. The next eligible approved item plays.

The selected mode is saved locally in `.broadcast-mode.json` and survives a bridge restart. It is not stored in Supabase and applies to this broadcast computer. The default after first install is AUTOMATION.

### Configure the encoder scenes

1. Create a **Prerecorded / Network Playout** scene and place the `TN Network Playout` browser source in it.
2. Create a separate **Live Event** scene with the camera, microphone, remote guest and graphics sources. Do **not** place the full-screen TN Network Playout browser source in this scene.
3. Create a **Standby** scene with the Tacoma Nights branded standby slate.
4. Connect OBS while the Prerecorded scene is active so the bridge can add its browser source there. In Streamlabs, add the browser source manually to the Prerecorded scene only.
5. Start the continuous YouTube stream manually from Master Control after checking the destination and scene. The bridge deliberately does not create, start, or stop YouTube broadcasts automatically.

To take a live event on air: choose **Enter live-event mode** in Master Control, then switch the encoder to the Live Event scene. To return to prerecorded programming: switch the encoder back to the Prerecorded scene, then choose **Resume automated programming**. Use the Standby scene when you need a safe slate between events.

The mode control only pauses/resumes playout; it does not start/stop the encoder, change the YouTube destination, or guarantee that YouTube is receiving a signal. Verify the encoder and YouTube Live Control Room separately. For true unattended 24/7 operation, keep the bridge, encoder, computer, network, and media sources continuously available and monitor them for failures.

## Hybrid 24/7 broadcast operation

Tacoma Nights supports one continuous YouTube livestream with two producer-controlled operating modes:

- **AUTOMATION** (default): the Node scheduler checks the existing Supabase schedule and approved playout queue. Eligible media and YouTube playlists are sent to the local TN Network Playout browser source. Queue entries are marked played or failed as playback finishes.
- **LIVE EVENT**: Master Control pauses automatic queue playback. If an item is currently playing, its queue status is returned to queued so it can resume later. The producer switches OBS/Streamlabs to a separate live scene and runs the live show. The bridge and Supabase scheduler remain available.
- **Resume automation**: the producer returns to Master Control and selects Resume automated programming. The next eligible approved item plays.

The selected mode is saved locally in `.broadcast-mode.json` and survives a bridge restart. It is not stored in Supabase and applies to this broadcast computer. The default after first install is AUTOMATION.

### Configure the encoder scenes

1. Create a **Prerecorded / Network Playout** scene and place the `TN Network Playout` browser source in it.
2. Create a separate **Live Event** scene with the camera, microphone, remote guest and graphics sources. Do **not** place the full-screen TN Network Playout browser source in this scene.
3. Create a **Standby** scene with the Tacoma Nights branded standby slate.
4. Connect OBS while the Prerecorded scene is active so the bridge can add its browser source there. In Streamlabs, add the browser source manually to the Prerecorded scene only.
5. Start the continuous YouTube stream manually from Master Control after checking the destination and scene. The bridge deliberately does not create, start, or stop YouTube broadcasts automatically.

To take a live event on air: choose **Enter live-event mode** in Master Control, then switch the encoder to the Live Event scene. To return to prerecorded programming: switch the encoder back to the Prerecorded scene, then choose **Resume automated programming**. Use the Standby scene when you need a safe slate between events.

The mode control only pauses/resumes playout; it does not start/stop the encoder, change the YouTube destination, or guarantee that YouTube is receiving a signal. Verify the encoder and YouTube Live Control Room separately. For true unattended 24/7 operation, keep the bridge, encoder, computer, network, and media sources continuously available and monitor them for failures.

## Safety
The service binds to `127.0.0.1` by default. Keep it local; never expose this API or OBS/Streamlabs control ports to the internet. Never commit `.env`, OBS passwords, Streamlabs tokens, YouTube stream keys, or Supabase secret/service-role keys. The bridge never starts or stops the YouTube stream automatically; stream start/stop remains a deliberate producer action.


## Verify the actual YouTube broadcast

The Master Control dashboard keeps encoder status separate from YouTube's own broadcast status. To enable automatic verification:

1. In Google Cloud Console, create or select a project and enable **YouTube Data API v3**.
2. Configure the OAuth consent screen. If the app is in Testing mode, add the CrowRules TV Google account as a test user.
3. Create an OAuth 2.0 **Web application** client ID.
4. Add this exact authorized redirect URI: `http://127.0.0.1:8787/youtube/callback`.
5. In the local `bridge/.env`, set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REDIRECT_URI=http://127.0.0.1:8787/youtube/callback`. Never put the client secret in GitHub or a browser page.
6. Restart the bridge, open local Master Control, and select **Connect YouTube account**. Sign in to the Google account that owns the CrowRules TV channel and approve the read-only YouTube permission.
7. Return to Master Control and select **Check YouTube now**. The dashboard checks the authenticated account's active broadcasts through `liveBroadcasts.list` and reports LIVE only when YouTube returns a broadcast whose lifecycle status is `live`.

The OAuth refresh token is stored locally in `bridge/.youtube-token.json` and is not committed. Keep the bridge computer private. If the Google OAuth app remains in Testing mode, refresh tokens may expire after seven days; publish/verify the consent configuration as appropriate for your app. The dashboard's YouTube check is read-only: it does not start, stop, or alter a YouTube broadcast. A missing active broadcast, API permission problem, or OAuth setup problem is shown as a separate status instead of guessing from the encoder state.
