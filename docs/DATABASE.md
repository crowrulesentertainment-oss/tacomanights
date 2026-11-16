# Shared Supabase Database

Project: `cevylpnoexugwgygvtgu` (existing CrowRules project). The new repository reuses this project; no second project was created.

Existing Tacoma Nights tables discovered include submissions, topic polls/options/votes, production episodes/tasks/calendar, episode plans/assets, host applications/assignments, remote hosts, crew, featured video, show/site settings, public stories, live sessions, clip uploads, analytics, community events, and watchlists.

The public submission form writes to `tacoma_nights_submissions`. Existing INSERT policy requires status=new, internal_notes and reviewed_at null, consent_to_contact=true, and a submission_type of crew_interest, guest_pitch, story_pitch, topic_suggestion or episode_question. The form sends only permitted columns.

Existing staff policies check server-issued `auth.jwt()->app_metadata->>role = 'admin'`. The Command Center uses that claim and remains subject to RLS. No database schema or policies were changed.

Public SELECT is already enabled for certain published settings/crew records. Production records, polls and public story records have deny/no-public-access policies in the inspected schema; this first build does not expose them publicly.
