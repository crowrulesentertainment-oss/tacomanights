# Tacoma Nights 24/7 Network architecture

YouTube Live is the public distribution destination. GitHub Pages serves the public portal and embeds the channel's live stream. A persistent Node.js bridge on the broadcast PC controls the encoder independently of the website. A browser refresh must never interrupt the stream.

## Engine policy
Support both OBS Studio and Streamlabs Desktop through adapters, but only one encoder should own the active output at a time. OBS WebSocket scene, stream and recording controls are implemented. Streamlabs uses the documented SockJS + JSON-RPC Remote Control API, token authentication, scene lookup/switching and StreamingService state-aware stream/record toggles. Both adapters require testing against the installed desktop versions before a live production run. Do not expose control ports to the internet.

## Existing Supabase integration
The connected project already contains these RLS-enabled tables: live_network_public_state, live_network_programs, live_network_schedule, live_network_playout_queue, live_network_operator_shifts, live_network_recording_segments and live_network_incidents. The public-state table has an anon/authenticated SELECT policy only for rows where is_published=true; owner INSERT/UPDATE is restricted to auth.uid() = owner_id. The other listed tables use owner-scoped authenticated policies (auth.uid() = owner_id). The public network player now reads only the published public-state row using the browser-safe Supabase publishable key in config.js. No service-role key is used.

The Studio now signs in with Supabase Auth and reads/writes the existing live_network_programs, live_network_schedule and live_network_playout_queue tables using the signed-in user's JWT. Existing owner-only RLS remains the access boundary; no new tables or policies were created. The local bridge accepts a bridge-token-protected pairing request, validates the supplied user access token through Supabase Auth, then uses that user JWT for REST reads and status updates. It never uses a service-role key. The queue is eligible only when approved=true and status=queued. A queue item linked to a program with no scheduled_at waits until that program's active schedule window; unlinked queue items use scheduled_at. The bridge marks queue rows playing, then played/failed. The public-state row is updated only for the paired owner's row. For private Storage media, use media_url value storage://bucket/path; the bridge creates a short-lived signed URL at playout time. No storage bucket policies were changed.

## Remote hosts
Use authenticated LiveKit rooms with short-lived server-minted tokens. Producer preview precedes on-air admission. Host disconnect returns to standby or scheduled playout. LiveKit deployment and token-minting service are not provisioned by this commit.

## Reliability
Record locally independently of YouTube archives. Monitor encoder status, bitrate, dropped frames, disk space and network. Rehearse media failure, host disconnect, network loss and encoder failover. Run a 72-hour controlled soak test before declaring continuous 24/7 readiness.
