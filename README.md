# Tacoma Nights — The City Comes Alive

CrowRules Entertainment's Tacoma Nights television and community storytelling website.

## Shared Supabase connection

The site connects to the existing CrowRules Supabase project `cevylpnoexugwgygvtgu` at `https://cevylpnoexugwgygvtgu.supabase.co`.

- Browser client uses the project's **publishable** key only.
- No service-role or secret key is shipped to the browser.
- The shared client is available as `window.tacomaNightsSupabase`.
- Public premiere display reads the published `tacoma_nights_show_settings` row (`setting_key = premiere`, `is_published = true`).
- The hero countdown uses a Friday 10:00 PM America/Los_Angeles recurring fallback when no future published premiere is available.
- The homepage countdown updates once per second and honors a future premiere time published by the admin workspace.
- Existing authentication/session support uses Supabase Auth in the browser.

## Existing Tacoma Nights data

The existing database is reused without creating duplicate tables or changing RLS policies. Relevant tables include `tacoma_nights_submissions`, `tacoma_nights_episode_plans`, `tacoma_nights_production_tasks`, `tacoma_nights_production_calendar`, `tacoma_nights_host_applications`, `tacoma_nights_host_assignments`, `tacoma_nights_remote_hosts`, `tacoma_nights_crew`, `tacoma_nights_featured_video`, `tacoma_nights_show_settings`, `tacoma_nights_site_settings`, `tacoma_nights_public_stories`, `tacoma_nights_topic_polls`, and related assets/analytics tables.

Public forms should insert only into `tacoma_nights_submissions` using the existing public INSERT policy and allowed submission types. Staff access checks server-issued `app_metadata.role=admin`; RLS remains authoritative. No RLS policies were changed for this upgrade.

## Homepage

- Cinematic Tacoma Nights hero and calls to action
- Live next-episode countdown in Pacific Time
- Supabase-published premiere schedule takes precedence over the recurring Friday 10 PM PT fallback
- YouTube embeds and channel-style links are normalized sitewide to the Tacoma Nights-only playlist `PLKfh6Jm08P-c`; the generic CrowRules channel feed is not used on this show site.
- Show segments, community participation and geographic coverage
- Responsive mobile and desktop layout
- Grouped dropdown navigation

## Pages and deployment

Home, Watch, Shows, Community Voices, Weekly Question, Participate, Explore, About, Member sign-in/dashboard, Admin Command Center with live operational counts, filterable submission review, CSV export, and a premiere publishing form; supporting read-only workspaces.

Enable GitHub Pages for `main` / root. Site uses relative paths. Verify nested pages and auth redirects after publishing.

Never commit service-role keys, secret keys, or other server credentials.


## Tacoma Nights-only video handling

- The canonical video source is the dedicated Tacoma Nights playlist: `PLKfh6Jm08P-c`.
- Homepage and Watch page embed that playlist directly using YouTube's privacy-enhanced player.
- The shared public-site script normalizes YouTube iframe embeds and generic channel links to the Tacoma Nights playlist, including dynamically added embeds.
- The general `@CrowRules_TV` channel feed is intentionally not linked from Tacoma Nights pages, preventing Back Deck Live content from being surfaced through a generic channel feed.

## Staff Command Center

- Staff sign-in requires the existing Supabase Auth user with `app_metadata.role = admin`.
- Overview counts use existing submissions, host applications, and production task tables.
- Community submissions can be searched and filtered in the browser; staff can export the loaded list as CSV.
- The premiere editor updates only the existing `tacoma_nights_show_settings` row with `setting_key = premiere`; it does not create tables, rows, or policies.
- The record workspaces remain read-only and rely on the current RLS rules. If a query is denied, the UI reports the database response rather than bypassing permissions.
- No database schema or RLS policy changes are part of this site upgrade.


## Raven Control Room integration

The public Tacoma Nights website uses the Raven Control Room as its editorial source of truth:
https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html

- The public navigation and staff entry points link directly to the central Control Room.
- `assets/js/control-room-bridge.js` loads after the shared Supabase browser client and reads the Control Room's existing public-facing settings under the current Row Level Security policies.
- Published premiere settings from `tacoma_nights_show_settings` drive the homepage countdown.
- The `featured_video` setting from `tacoma_nights_featured_video` controls the homepage featured video; the dedicated Tacoma Nights playlist remains the fallback.
- The `weekly_question` setting from `tacoma_nights_site_settings` drives the public weekly-question page and homepage question.
- Published crew profiles from `tacoma_nights_crew` populate the homepage team section.
- Public pages never load the private Control Room HTML or its admin-only records. The bridge uses the existing browser-safe publishable key and respects RLS. No service-role key, auth bypass, table, or policy changes are introduced.


## Primary Tacoma Nights Control Room

The canonical administration and publishing workspace is the Raven Control Room:
https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html

The Control Room and this GitHub Pages site use the same Supabase project and publishable browser key. Public pages do not scrape or embed the private admin HTML. They read only published/public records from the shared Supabase database through `assets/js/control-room-bridge.js`, subject to the existing Row Level Security policies.

Public site synchronization reads:
- `tacoma_nights_show_settings` — published premiere title and date/time.
- `tacoma_nights_featured_video` — approved homepage featured video and copy.
- `tacoma_nights_site_settings` — published weekly question.
- `tacoma_nights_crew` — published crew profiles.

The shared site navigation and footer route staff to the Raven Control Room. The local admin pages remain available as secondary tools; the Raven Control Room is the primary place to manage and publish show content. Public pages refresh the shared settings on page load, when returning to the tab, and periodically while visible.

Only select videos from the official Tacoma Nights YouTube playlist `PLKfh6Jm08P-c` in the Control Room featured-video field. Never select Back Deck Live or unrelated CrowRules programming.
