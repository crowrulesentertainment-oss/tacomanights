# Tacoma Nights 24/7 Network architecture

YouTube Live is the public distribution destination. GitHub Pages serves the public portal and embeds the channel's live stream. A persistent Node.js bridge on the broadcast PC controls the encoder independently of the website. A browser refresh must never interrupt the stream.

## Engine policy
Support both OBS Studio and Streamlabs Desktop through adapters, but only one encoder should own the active output at a time. OBS WebSocket scene, stream and recording controls are implemented in the initial bridge. Streamlabs adapter is connection-only until its installed API protocol is verified. Do not expose control ports to the internet.

## Backend integration
Supabase is the intended auth, schedule, media metadata and command queue backend. Existing schema, roles, RLS and storage policies must be inspected before migrations. Do not duplicate existing member/auth tables or replace existing policies. Proposed additive entities: network_programs, network_schedule, network_media, network_hosts, network_host_sessions, network_commands, network_incidents and network_audit_logs. Privileged commands must be authorized server-side, expire, be idempotent and be acknowledged by the bridge.

## Remote hosts
Use authenticated LiveKit rooms with short-lived server-minted tokens. Producer preview precedes on-air admission. Host disconnect returns to standby or scheduled playout. LiveKit deployment and token-minting service are not provisioned by this commit.

## Reliability
Record locally independently of YouTube archives. Monitor encoder status, bitrate, dropped frames, disk space and network. Rehearse media failure, host disconnect, network loss and encoder failover. Run a 72-hour controlled soak test before declaring continuous 24/7 readiness.
