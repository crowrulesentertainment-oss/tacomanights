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
- YouTube playlist embed and links
- Show segments, community participation and geographic coverage
- Responsive mobile and desktop layout
- Grouped dropdown navigation

## Pages and deployment

Home, Watch, Shows, Community Voices, Weekly Question, Participate, Explore, About, Member sign-in/dashboard, Admin Command Center and supporting workspaces.

Enable GitHub Pages for `main` / root. Site uses relative paths. Verify nested pages and auth redirects after publishing.

Never commit service-role keys, secret keys, or other server credentials.
