# Tacoma Nights Community 2.0 setup

This branch adds a community portal, a vertical People's Mic recording page, a moderation workspace and a Supabase migration.

## New public pages
- `community.html`: forum, polls, People's Spotlight, clips, member introductions, events calendar, watch parties, behind-the-episode updates and recognition.
- `people-mic.html`: 9:16 browser camera recording, preview/retake and private upload to the admin review queue.

## Admin
- `admin/community.html`: review pending, published and all community records. The database policy checks the JWT app_metadata role, not just the page.
- Admin accounts must have `app_metadata.role = "admin"` or `app_metadata.tacoma_nights_admin = true`. Use Supabase's trusted admin process to set claims; never allow members to edit their own app_metadata.

## Required database setup
1. Review `supabase/migrations/202611160001_tacoma_nights_community_2_0.sql`.
2. Run it in the Supabase SQL Editor.
3. Confirm the relevant administrator account has the required app_metadata claim.
4. Test sign-in, public reads, member inserts, moderation and private object access using separate member and admin accounts.

## Important behavior and limitations
- Member-generated content is submitted as pending and must be approved before appearing publicly.
- The People's Mic studio uses MediaRecorder and requires HTTPS plus browser camera/microphone permission.
- Video submission requires a signed-in member. Recordings remain in a private bucket and are not automatically published.
- Community pages use the existing browser-safe publishable Supabase key. Do not add a service-role key.
- Poll options are stored in the poll item's metadata as an `options` array. Create and publish poll records from an authorized admin workflow.
- This migration is additive. It does not alter existing Tacoma Nights tables or existing RLS policies.
- The public page is a first implementation of the modules. Production launch should follow database migration and real-account QA.
