# Tacoma Nights Website Foundation 1.0

Multi-page HTML/CSS/JavaScript foundation for Tacoma Nights.

Pages: Home, Watch, Live & Premieres, Episode Archive, Perspectives, four segment pages, Community, Members, Crew, Join the Crew and About.

## Existing CrowRules integration
- Supabase project: `cevylpnoexugwgygvtgu`
- Browser client uses the existing publishable key only.
- Episodes use the existing `tacoma-nights-api` Edge Function with `action=episodes`.
- Live page reads the existing `tacoma_nights_show_settings` premiere record and differentiates scheduled from live.
- YouTube channel: `@CrowRules_TV`; playlist: `PLKfh6Jm08P-c`.

The original public website foundation preserved the existing database and storage setup. Phase 1 now adds the contributor-production schema and private upload bucket documented below; unrelated CrowRules tables, providers and records remain untouched.

## Deploy
GitHub Actions workflow: `.github/workflows/pages.yml`. Set repository Settings → Pages → Build and deployment → GitHub Actions if needed. Project Pages path is normally `/tacomanights/`.

## Roadmap
1. Public website and shared integration foundation.
2. Member profiles, moderated discussion boards, threaded replies, reactions, reports and community polls (connected to existing tn_community_* tables).
2.1. Community administration dashboard: moderation queues, reports, reply visibility, poll management, featured conversations and weekly questions.
2.2. Public member profiles, avatar uploads, follows, recognition from helpful reactions, achievement display, notifications inbox and participation history.
3. Vertical recording studio and member submissions.
4. Remote host applications, multiple video uploads and crew workspace.
5. Live/episode engagement and analytics.
6. Advanced community programming and recognition.

Phase 2 connects member profiles, moderated discussion posts, replies, reactions, reports and poll voting to existing `tn_community_*` tables. Member display name, bio, city and interests are stored in the signed-in user's own Auth metadata; this does not create a public member directory. Community submissions enter the existing pending moderation state. No database schema, RLS policy, storage bucket, auth provider or existing record was changed. Phase 2.1 adds `admin.html` and an administrator dashboard guarded by the existing `tn_is_community_admin()` database function. It relies on existing JWT `app_metadata.role=admin` or `app_metadata.tacoma_nights_admin=true` claims; it does not grant privileges or modify RLS. Admins can approve/reject/hide posts, review reports, hide/restore replies, feature conversations, hide polls and publish the weekly question. Phase 2.2 adds a member directory and public profile pages using the existing `community_profiles`, `community_follows`, `community_achievements`, `community_member_achievements`, `community_notifications` and existing `podcast-avatars` storage bucket. It does not create tables or policies. Member profile fields, avatar uploads, following, badge display, helpful-contribution rankings, read-only notifications inbox and Tacoma Nights post/reply activity history are implemented in the website. Phase 2.2.1 hardened the existing Supabase policies and grants without creating or replacing the community tables. Public profile reads now require `is_public=true`; members can read and edit only their own profile. Column-level grants prevent clients from changing `role` or `reputation`. Notifications are recipient-only and clients can update only `read_at`; client INSERT/DELETE access is revoked. Earned achievements are readable only for public profiles or by the owner and cannot be self-awarded. Follow relationship reads are scoped to the current member or relationships between public profiles. Trusted database triggers now create notifications for follows, replies, helpful reactions and achievement awards, and award First Voice / Conversation Starter on first publication plus Community Helper on the first helpful reaction received. Trigger helpers live in the non-exposed `private` schema, use a fixed empty search path, and have execute privileges revoked from API roles. Phase 3 recording and Phase 4 contributor applications remain staged.
## Authentication redirect
The member sign-up and password-reset flows return to the current `members.html` URL. Ensure the deployed GitHub Pages URL is present in Supabase Auth → URL Configuration → Redirect URLs:
`https://crowrulesentertainment-oss.github.io/tacomanights/**`
Also add your local development origin when testing locally.

## Hero photography
The Tacoma and Mount Rainier hero image is from the USGS Volcano Hazards Program and is marked public domain: https://www.usgs.gov/media/images/mount-rainier-and-tacoma-wa


## Tacoma Nights Network expansion

This branch expands the original foundation into a hybrid streaming-TV and community newsroom experience.

### Public pages
- Cinematic network homepage with existing premiere status, episode publishing service and published crew profile integration.
- Watch and Live pages retain the official CrowRules TV channel, YouTube playlist and existing premiere settings.
- Episode archive remains connected to the existing `tacoma-nights-api?action=episodes` Edge Function.
- Nine dedicated segment pages: Main Conversation, Triton Segment, The Weekly Lineup, 253 Spotlight, Tacoma Then & Now, Neighbor's Mic, Tacoma Wishlist, Make It Happen and The Unfiltered Question.
- Nine individual segment recording studios under `studios/`.
- Tacoma Newsroom, news-tip submission, community events and event submission pages.
- Production Center and episode detail player.

### Recording studio behavior
The individual studios use browser `getUserMedia` and `MediaRecorder` for horizontal camera + microphone capture, local preview and WebM download. Recordings remain in the contributor's browser and are not silently uploaded. A private upload/review queue must be connected only after the existing Supabase storage bucket, schema and RLS policies are inspected and verified.

### News and event submissions
The public submission forms prepare an email to `crowrulesentertainment@gmail.com`. The visitor must review and send the email from their own email application. No unverified database tables or Edge Function actions are assumed. A later milestone can connect these forms to moderated Supabase tables after schema and policy review.

### Visual system
The shared `assets/css/network.css` provides the cinematic hybrid streaming/broadcast styling. Photography uses remote image sources and should be replaced with owned or appropriately licensed Tacoma/Pacific Northwest imagery as the final asset library is curated.

### Safety and integration boundaries
- Reuses the existing browser-safe Supabase publishable key and existing project.
- Does not expose a service-role key.
- Does not create, alter or delete Supabase tables, policies, storage buckets, auth providers or existing records.
- Existing premiere and episode integrations remain the source of truth.
- All news submissions require editorial review; community events require verification before promotion.
- Camera/microphone recording requires explicit browser permission and user action.


## Production & Contributor Management 2.0 — Phase 1

### New portals
- `production/contributor.html`: passwordless email sign-in, linked contributor identity, assigned work, resumable private video upload, and submission history.
- `production/review.html`: administrator-only crew account linking, assignment creation, private signed-preview review, producer feedback, and approval/revision/rejection.
- `assets/js/production.js`: shared authentication, assignment, resumable upload and review logic.

### Database and storage
- Migration: `supabase/migrations/202611160001_tacoma_nights_production_phase1.sql`.
- Adds `user_id` to existing `tacoma_nights_crew` for an administrator-controlled Auth-to-crew link.
- Adds `tacoma_nights_contributor_assignments` and `tacoma_nights_contributor_submissions`.
- Creates private Storage bucket `tacoma-nights-submissions` (1 GB maximum, MP4/WebM/QuickTime).
- RLS limits contributors to their linked profile, assignments, own submission metadata and own storage objects. Admin operations require `auth.jwt()->'app_metadata'->>'role' = 'admin'`.
- New submission records automatically move their assignment to submitted; producer revision/approval decisions synchronize assignment status.

### Setup and operational notes
1. Confirm the signed-in producer has the existing Supabase `app_metadata.role=admin` claim.
2. Add the deployed GitHub Pages portal URLs to Supabase Auth → URL Configuration → Redirect URLs: `https://crowrulesentertainment-oss.github.io/tacomanights/**`.
3. A contributor signs in at `/production/contributor.html`; the portal displays their Supabase Auth UUID.
4. An administrator links that UUID to the correct existing crew profile at `/production/review.html`. This is intentionally an explicit producer action to prevent account/profile impersonation.
5. Create assignments only for linked crew profiles. Contributors upload footage into private storage; producers preview using short-lived signed URLs.
6. Approved footage remains private in this phase. Publishing/moving it to public episode assets is a later, explicit workflow.

### Security boundaries
- No service-role key is used in browser code.
- No existing public video bucket or podcast creator bucket is reused for raw contributor footage.
- The private bucket is not publicly readable. Signed previews expire after five minutes.
- Uploads are limited to video MIME types and 1 GB. Rights/consent confirmation is required in the portal.
- Existing episode, public crew, clip upload and other CrowRules policies are not broadly replaced.
- The producer dashboard does not automatically publish footage or modify YouTube.
