# Tacoma Nights Network — Architecture

## Product principles
1. Network-first public experience: show, contributors, newsroom, events and community live under one brand.
2. Mobile-first and accessible: semantic HTML, keyboard navigation, visible focus, reduced-motion support.
3. Static frontend: GitHub Pages hosts HTML/CSS/JS; no server secrets or privileged operations in the browser.
4. Existing Supabase resources are reused only after schema, RLS and ownership verification.
5. Public video is hosted by YouTube; private raw contributor footage is stored in private Supabase Storage buckets.
6. Moderation is mandatory for public user-generated news, event, photo and nomination submissions.

## Public information architecture
- Home / Network
- Watch / Premiere / Archive
- Perspectives: The 253, Triton Peterson, JonCool, Kenneth WarnerShook
- Newsroom / Story submissions
- Events / Event submissions
- The 253: Unfiltered Question, Shoutouts, Polls, Photo Challenges, 253 Heroes, Awards, Spotlight, Tacoma Time Capsule
- Remote Host Applications
- Memberships and Member Profiles
- On The Back Deck: Back Deck Live and Building Community
- Admin Command Center

## Trust boundaries
- Browser: public Supabase anon key only; public reads and explicitly permitted user actions.
- Supabase Auth: identity and session lifecycle.
- PostgreSQL RLS: enforce member, contributor, producer and administrator access.
- Private Storage: raw uploads remain private; signed URLs are short-lived and scoped.
- Edge Functions: privileged API calls, YouTube Data API credentials, upload finalization, notification dispatch and other secrets.
- Admin actions: authorization checked server-side; UI visibility alone is never authorization.

## Data integration approach
Before creating or altering tables, inventory current schema, constraints, indexes, triggers, policies, storage buckets and functions. Prefer narrow additive migrations. Do not alter Podcasting or Back Deck policies as part of Tacoma Nights work.

Potential domain groups:
- Episodes and season metadata
- Contributor profiles, applications and assignments
- Segment submissions and review decisions
- Newsroom tips and published stories
- Events and event submissions
- Community questions, polls, votes and responses
- Photo challenges and nominations
- Member profiles and notification preferences
- YouTube channel metrics and milestone history
- Audit events

Names above are logical domain groups, not assertions that corresponding tables need to be created. Map existing tables first.

## YouTube milestone rules
- Starting display: 821 subscribers; next goal 1,000.
- When count reaches goal, advance to 2,000; thereafter advance in increments of 1,000 through 5,000, then 5,000 increments through 25,000, then 25,000 increments through 100,000. Admin may pause or set a custom goal.
- The live count must come from a trusted server-side integration. The browser must never contain a private YouTube API key.
- Label cached or unavailable counts accurately; never represent the starting display as a verified live count.

## Delivery sequence
1. Phase 1: visual shell, homepage, design system and public network map.
2. Phase 1.1: repository and Supabase integration verification.
3. Dedicated public pages and dynamic content integrations.
4. Moderation, memberships and community participation.
5. Production Room and upload/review hardening.
6. Admin analytics, notifications, YouTube growth automation and monitoring.

## Current image sources
See README.md for the source pages and licensing notes for the Tacoma nightscape and waterfront imagery.
