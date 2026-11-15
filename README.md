# Tacoma Nights — The City Comes Alive

CrowRules Entertainment's Tacoma Nights television and community storytelling website.

## Shared Supabase
Uses the existing CrowRules Supabase project `cevylpnoexugwgygvtgu` at `https://cevylpnoexugwgygvtgu.supabase.co`. Browser code uses only a publishable key. No new Supabase project or schema changes are required for this first deployment.

Existing Tacoma Nights tables discovered and reused include `tacoma_nights_submissions`, `tacoma_nights_episode_plans`, `tacoma_nights_production_tasks`, `tacoma_nights_production_calendar`, `tacoma_nights_host_applications`, `tacoma_nights_host_assignments`, `tacoma_nights_remote_hosts`, `tacoma_nights_crew`, `tacoma_nights_featured_video`, `tacoma_nights_show_settings`, `tacoma_nights_site_settings`, `tacoma_nights_public_stories`, `tacoma_nights_topic_polls`, and related assets/analytics tables.

The public form inserts only into `tacoma_nights_submissions` using the existing public INSERT policy and permitted submission types. Staff access checks server-issued `app_metadata.role=admin`; RLS remains authoritative. No RLS policies were changed.

## Pages
Home, Watch, Shows, Community Voices, Weekly Question, Participate, Explore, About, Member sign-in/dashboard, Admin Command Center and read-only workspaces.

## Deploy
Enable GitHub Pages for `main` / root. Site uses relative paths. Verify nested pages and auth redirects after publishing.

Never commit service_role keys or secrets.
