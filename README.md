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


### Sitewide YouTube + Control Room connection

Every public page that loads `assets/js/site.js` also loads the public read-only Control Room bridge after the browser-safe Supabase client is ready. The bridge injects a shared Tacoma Nights YouTube / Raven Control Room panel above the footer, so visitors can reach the official playlist and staff can open the canonical Control Room from any public page.

The panel reads the published `premiere` row in `tacoma_nights_show_settings`. When the Control Room publishes a YouTube video ID and status (`scheduled`, `live`, or `ended`), the sitewide watch action links directly to that video and labels the state as upcoming, live, or replay. Otherwise it falls back to the official Tacoma Nights playlist. The homepage and Watch page use the Control Room's featured-video setting for their main player; the Watch page retains a separate full-playlist link.

The bridge refreshes on page load, tab focus/visibility return, and every five minutes while visible. It does not attempt to start a YouTube broadcast, control OBS, expose private Control Room data, or use a service-role key. YouTube video IDs and publishing status must be entered and published by an authorized operator in Raven Control Room.

## Cinematic community platform additions

The staging build retains the existing site and adds:
- A dedicated homepage live/premiere player and scheduled/live YouTube chat, driven by the existing published Raven Control Room premiere setting.
- A separate daily rotating archive episode player.
- A Tacoma downtown-at-night hero photograph with visible photographer and license attribution.
- Dedicated CrowRules network, Tacoma Community Hub connection, and crew/community Discord pages.
- Direct navigation to The Teenager Perspective, The Cool Perspective, The Weekly Lineup, and future segments.
- Homepage pathways to the People's Mic, message board, polls, story/event ideas, crew chat and Tacoma Community Hub.

The Tacoma Community Hub is connected through shared navigation and editorial cross-links; its verified directory/event records remain managed by the Hub itself. Tacoma Nights keeps its own episode and community workflows.

No production Supabase tables, records, authentication settings, storage policies or RLS policies are changed by this staging build. See [the staging build notes](docs/CINEMATIC-COMMUNITY-PLATFORM.md).
