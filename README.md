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
2. Member profiles, boards, polls, weekly questions and moderation.
3. Vertical recording studio and member submissions.
4. Remote host applications, multiple video uploads and crew workspace.
5. Live/episode engagement and analytics.
6. Advanced community programming and recognition.

Member sign-in is active in Foundation 1.0. Community boards, profile editing, recording and applications are staged for later phases.
## Authentication redirect
The member sign-up and password-reset flows return to the current `members.html` URL. Ensure the deployed GitHub Pages URL is present in Supabase Auth → URL Configuration → Redirect URLs:
`https://crowrulesentertainment-oss.github.io/tacomanights/**`
Also add your local development origin when testing locally.

## Hero photography
The Tacoma and Mount Rainier hero image is from the USGS Volcano Hazards Program and is marked public domain: https://www.usgs.gov/media/images/mount-rainier-and-tacoma-wa
