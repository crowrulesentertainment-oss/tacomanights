# Tacoma Nights Studio 2.0 — implementation plan

## Approved product decisions
- YouTube programming includes actual playout and on-screen playlist graphics.
- Broadcast format is hybrid: live shows plus prerecorded programming.
- Automation is producer-controlled with automation assistance; no unattended automatic stream start/stop.
- Studio access target: administrators, producers and approved hosts. Inspect existing role sources and RLS before adding role gates; sign-in alone must not be treated as proof of a producer role.
- Full scope: workspace, YouTube programming, broadcast control, production team, graphics/audience and post-production.

## Preservation requirements
1. Keep current Master Control, Programming, Media Library, Producer Desk, Host Control, Graphics, Monitoring and Settings pages.
2. Reuse existing Supabase tables and policies wherever possible. Do not drop, rename, truncate or broadly relax RLS policies.
3. Reuse the existing local bridge at 127.0.0.1:8787, OBS and Streamlabs adapters, YouTube read-only OAuth status, and live_network_playout_queue.
4. Keep YouTube stream start/stop a deliberate producer action. Playlist transitions must not stop or recreate the YouTube livestream.
5. Keep secrets, OAuth client secrets, bridge tokens, encoder passwords and stream keys off GitHub Pages and out of browser code.
6. Add features behind existing auth and explicit producer approval. Keep public network pages separate from internal controls.

## Existing architecture found during inspection
- Static GitHub Pages Studio under studio/.
- Existing Supabase browser client and studio-auth.js session flow.
- Existing tables: live_network_programs, live_network_schedule, live_network_playout_queue and live_network_public_state.
- Existing local Node bridge with OBS and Streamlabs adapters.
- Existing local /playout browser source supports YouTube playlist items through the YouTube IFrame Player API and advances the queue after the final playlist video.
- Existing Media & Playout page accepts YouTube playlist URLs and stores them as youtube-playlist://<playlistId>.

## Release 1 — Studio 2.0 workspace and usability
- Add direct navigation to Playlist Control.
- Surface bridge, current playout and queue status.
- Provide producer workflow for adding, previewing, approving and skipping queue items.
- Keep existing Studio pages and login flow.
- Make the new workspace responsive on desktop, tablet and mobile.
- Verify the actual allowed user roles against existing Supabase policies before describing the new page as role-restricted.

## Release 2 — YouTube Programming 2.0
- Build on existing playlist queue and local playout implementation.
- Additive graphics foundation now implemented on this branch: transparent OBS/Streamlabs browser-source overlays for Now Playing, Next Up, network ticker and full-screen slate.
- Studio Graphics page now provides live preview, source URLs and copy controls.
- Public network homepage and program guide now display current and next program from the existing published public-state record.
- Bridge now publishes the next scheduled program and start time to existing public-state fields during its 15-second heartbeat.
- Current public schedule presentation is current + next only; a full multi-entry public EPG requires verifying existing public schedule read policy or designing a narrowly scoped public projection before exposing more schedule rows.
- Add playlist/video preview, producer approval and clear queue states.
- Add now-playing / next-up graphics as a separate browser-source overlay, driven by safe public state.
- Add queue diagnostics for non-embeddable videos, private playlists, unavailable media and playback errors.
- Add explicit producer skip/replay controls only after verifying bridge command semantics and safe queue-state transitions.

## Release 3 — Broadcast Control 2.0
- Verify OBS WebSocket and Streamlabs Remote Control adapters against actual local installations.
- Add bridge health, encoder health, stream state and YouTube state as separate indicators.
- Add scene presets, standby recovery and broadcast event log.
- Keep start/stop stream controls separate from playout queue transitions.
- Add emergency standby only after testing each supported encoder adapter.

## Release 4 — Production Team 2.0
- Host and guest availability, assignments and call sheets.
- Producer notes and pre-show connection checks.
- Role-based views for administrator, producer and approved host.
- Reuse existing account/profile sources where available; do not create duplicate member identities.

## Release 5 — Graphics and Audience 2.0
- Broadcast lower thirds, now-playing, next-up, community ticker and approved viewer messages.
- Producer preview before graphics go on air.
- Moderation and approval for all viewer-submitted material.
- Public graphics/browser sources must not expose private producer notes or account data.

## Release 6 — Post-Production 2.0
- Episode package and recording references.
- Publishing checklist, YouTube metadata preparation and archive sync.
- Chapter/timestamp planning, thumbnail workflow and promotional assets.
- Analytics sourced from available YouTube data; never fabricate audience metrics.

## Validation gates
- Existing login, RLS and current Studio pages continue to work.
- New playlist workspace reads/writes only the signed-in user's queue rows under current RLS.
- A producer can add a YouTube playlist and approve it.
- Local bridge reports the active playlist in /playout/state.
- OBS and Streamlabs both render the same local playout source.
- A playlist reaches its final video and the queue advances without ending the YouTube livestream.
- Live host handoff and emergency standby are tested independently.
- No credentials or secrets are committed.

## Current branch status
Release 1 foundation and the first Release 2 on-air graphics/schedule foundation are implemented additively on this branch. Playlist Control reuses the existing queue schema and local bridge. Graphics reuse the existing published public-state record and require no schema or RLS changes. The bridge now syncs the next scheduled program into existing next-program fields. The public guide currently shows current + next, not a full multi-row EPG. Explicit role-based access remains a validation item before claiming that all target roles are enforced. Further releases remain gated on inspection and end-to-end testing of the bridge and encoder installations.


## Public EPG extension — staged
- Add an explicit `is_public` producer checkbox and per-entry Publish/Unpublish action. New schedule entries default to private.
- Add `live_network_public_schedule`, a narrow read model populated by the authenticated local bridge from explicitly listed schedule entries only.
- Anonymous readers receive column-level SELECT only for public display fields; owner IDs and source schedule IDs are not granted to anon. RLS permits public reads only where `is_published = true`; authenticated writes remain owner-scoped.
- Bridge refreshes the projection every 15 seconds, prunes unpublished/deleted rows, and copies no producer notes or playout queue data. Private program titles are also suppressed from the public live-state record.
- Public guide supports 7-, 14- and 30-day views, grouped by Tacoma/Pacific calendar date, with live/on-air markers.
- Production Supabase migrations applied: `public_network_epg_20261123`, `restrict_public_network_epg_anon_columns`, and `revoke_anon_private_network_schedule_access`.
- Anonymous access is limited to the public display columns. Anonymous SELECT on `live_network_schedule` and `live_network_programs` is revoked; the owner-only authenticated RLS policies remain in place.
- Verified with SQL role tests: anonymous can select the allowed EPG display fields; anonymous cannot select owner/source/publication fields or query the private schedule/program tables. A temporary published-row visibility test was rolled back; no test data remains.
- The GitHub Pages/browser rendering and local bridge synchronization still require an end-to-end test after the local bridge is updated/restarted. No OBS/Streamlabs or YouTube encoder test has been performed.


## Studio 3.0 — Multi-Channel Network foundation (Release 1 + 2)

### Implemented on branch: `studio-3.0-network-foundation`
- Added `network_channels` as an owner-scoped channel registry with channel key, description, lifecycle status, single/multiple operating mode, distribution preference, website path, YouTube channel ID and playlist ID. No stream keys or OAuth secrets are stored.
- Added nullable `channel_id` associations to programs, schedules, playout queue entries, and the public EPG projection. Existing records remain NULL/unassigned and continue to use the legacy network-wide workflow.
- Added the Studio Channel Manager at `studio/channels.html` with create/list/pause/activate controls.
- Added channel selectors to program creation and schedule creation. Programs and schedule entries can be assigned independently; schedule selection follows the selected program's channel when available.
- Added a Channel Manager link to the existing Master Control navigation.
- Added owner-only RLS for the channel registry. Anonymous privileges are explicitly revoked; authenticated table privileges are granted and constrained by `auth.uid() = owner_id`.
- The migration is additive. Existing OBS/Streamlabs adapters, local bridge routes, YouTube OAuth status flow, stream start/stop controls, public guide page and current queue behavior were not modified by this release.
- The new channel_id field on the playout queue is groundwork only; the existing bridge continues to consume the existing queue behavior until a separately tested channel-aware playout release.
- Public channel pages, multi-channel EPG rendering, YouTube output activation and simultaneous encoder sessions remain later releases.

### Validation still required
- Verify the new channel table is available through the project's Data API and that anonymous reads/writes are denied.
- Sign in to Studio, create a test channel, assign a program and schedule entry, and confirm owner-scoped reads/writes.
- Verify legacy unassigned programs, schedule entries, queue items and current public guide remain unchanged.
- Do not test encoder switching or stream start/stop as part of this foundation release.
