# Tacoma Nights Cinematic Community Platform

## Staging branch
Development branch: `staging-cinematic-community-platform-2026-11-16`

This branch is based on the intact `staging-cinematic-complete` snapshot and is intended for review before any production merge. The public `main` branch is not modified by this work.

## Scope delivered in this staging pass
- Retains the existing HTML/CSS/JavaScript site, page structure, admin workspaces, contributor application and upload workflows, episode archive, and community features.
- Adds a dedicated Tacoma Nights live/premiere player on the homepage.
- The live player reads the published premiere record from the existing Raven Control Room bridge. It displays the published YouTube video when the premiere status is `scheduled`, `live`, or `ended`; otherwise it falls back to the CrowRules TV live channel endpoint.
- Embeds the YouTube live chat only while a published premiere is scheduled or live. The daily rotating past-episode player remains as a separate homepage feature.
- Uses a real Tacoma downtown-at-night photograph for the homepage hero. The visible footer credit links to the photographer attribution and CC BY-SA 2.0 license.
- Adds the CrowRules network directory (`network.html`), Tacoma Community Hub connection page (`tacoma-community.html`), and Crew & Community Chat page (`crew-chat.html`).
- Expands the homepage with links for message board, polls, People's Mic, story/event ideas, Tacoma Community Hub, crew chat, Discord, and CrowRules divisions.
- Adds direct navigation to The Teenager Perspective, The Cool Perspective, and The Weekly Lineup.
- Repairs a literal escaped newline in the navigation script that prevented the menu script from parsing.

## Tacoma Community Hub integration
Tacoma Nights and Tacoma Community Hub remain distinct public experiences connected by navigation and editorial cross-links:
- Tacoma Community Hub remains the destination for its verified Tacoma/Pierce County resources, businesses, organizations and events.
- Tacoma Nights remains the destination for show episodes, community discussion, polls, story ideas, Question of the Week and production submissions.
- The bridge page clearly routes visitors to the appropriate system.
- No cross-project authentication assumptions, database synchronization, or schema changes are introduced.

## Data and security preservation
- Existing Supabase project: `cevylpnoexugwgygvtgu`.
- Existing browser-safe publishable key remains in `assets/js/config.js`.
- No service-role key or secret is added to client code.
- Existing tables, data, Auth configuration, storage policies and RLS policies are not changed by this staging pass.
- The existing Raven Control Room remains the editorial source of truth for premiere, featured video, weekly question and published crew data.
- Community submissions remain subject to the existing moderation and RLS workflows.

## Validation completed
- JavaScript syntax parsed successfully for `assets/js/site.js`.
- Required navigation pages were checked against the staging branch tree; no missing page targets were found.
- The three new HTML pages and updated homepage/CSS/JS/Control Room bridge are present in the staging branch.
- No production merge or production deployment was performed.

## Production review checklist
1. Review the staging branch and draft pull request.
2. Verify the live premiere and live-chat embed using an actual published YouTube video ID in Raven Control Room.
3. Test the vertical People's Mic recording on supported mobile browsers and confirm private upload/moderation.
4. Test public story/event submissions and community interactions with real member accounts.
5. Verify the Tacoma Community Hub link and CrowRules network destinations.
6. Only merge after visual, functional, mobile, accessibility and RLS verification.
