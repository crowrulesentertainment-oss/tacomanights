# Tacoma Nights Website Foundation 1.0

Multi-page HTML/CSS/JavaScript foundation for Tacoma Nights.

Pages: Home, Watch, Live & Premieres, Episode Archive, Perspectives, four segment pages, Community, Members, Crew, Join the Crew and About.

## Existing CrowRules integration
- Supabase project: `cevylpnoexugwgygvtgu`
- Browser client uses the existing publishable key only.
- Episodes use the existing `tacoma-nights-api` Edge Function with `action=episodes`.
- Live page reads the existing `tacoma_nights_show_settings` premiere record and differentiates scheduled from live.
- YouTube channel: `@CrowRules_TV`; playlist: `PLKfh6Jm08P-c`.

No database tables, RLS policies, storage buckets, auth providers or records are created, altered or deleted. Inspect the live schema before Phase 2+.

## Deploy
GitHub Actions workflow: `.github/workflows/pages.yml`. Set repository Settings → Pages → Build and deployment → GitHub Actions if needed. Project Pages path is normally `/tacomanights/`.

## Roadmap
1. Public website and shared integration foundation.
2. Member profiles, moderated discussion boards, threaded replies, reactions, reports and community polls (connected to existing tn_community_* tables).
2.1. Community administration dashboard: moderation queues, reports, reply visibility, poll management, featured conversations and weekly questions.
3. Vertical recording studio and member submissions.
4. Remote host applications, multiple video uploads and crew workspace.
5. Live/episode engagement and analytics.
6. Advanced community programming and recognition.

Phase 2 connects member profiles, moderated discussion posts, replies, reactions, reports and poll voting to existing `tn_community_*` tables. Member display name, bio, city and interests are stored in the signed-in user's own Auth metadata; this does not create a public member directory. Community submissions enter the existing pending moderation state. No database schema, RLS policy, storage bucket, auth provider or existing record was changed. Phase 2.1 adds `admin.html` and an administrator dashboard guarded by the existing `tn_is_community_admin()` database function. It relies on existing JWT `app_metadata.role=admin` or `app_metadata.tacoma_nights_admin=true` claims; it does not grant privileges or modify RLS. Admins can approve/reject/hide posts, review reports, hide/restore replies, feature conversations, hide polls and publish the weekly question. Phase 3 recording and Phase 4 contributor applications remain staged.
## Authentication redirect
The member sign-up and password-reset flows return to the current `members.html` URL. Ensure the deployed GitHub Pages URL is present in Supabase Auth → URL Configuration → Redirect URLs:
`https://crowrulesentertainment-oss.github.io/tacomanights/**`
Also add your local development origin when testing locally.

## Hero photography
The Tacoma and Mount Rainier hero image is from the USGS Volcano Hazards Program and is marked public domain: https://www.usgs.gov/media/images/mount-rainier-and-tacoma-wa
