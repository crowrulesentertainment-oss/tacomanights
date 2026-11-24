# Tacoma Nights 2.0 — Cinematic Community Network

## Product direction
A complete public-site rebuild with a cinematic, photorealistic Tacoma / Pacific Northwest identity. The raven is a recurring editorial symbol, not a cartoon mascot. The platform combines a television network, detailed show discovery, community participation, and a moderated storytelling archive.

## Non-negotiable preservation
- Keep the existing GitHub Pages deployment and relative-path routing.
- Preserve existing public URLs and add redirects/links rather than deleting established pages.
- Preserve Supabase Auth, existing `tn_content`, `tn_submissions`, `tn_memberships`, and all current RLS policies.
- Preserve the Studio, Control Room, local broadcast bridge, OBS and Streamlabs adapters, playout queue, overlays, network schedule, and channel registry.
- Do not alter live-network tables or broadcast bridge behavior as part of the public-site redesign.
- Never place Supabase service-role keys, stream keys, OAuth secrets, or bridge tokens in browser code.

## Information architecture
- Home: cinematic hero, live/featured program, show discovery, weekly question, latest episodes, crew preview, Inside the 253, community calls to action.
- Watch: live network, episode archive, program guide, show detail pages.
- Shows: individual show pages with premise, format, host/crew, recurring segments, episode guide, schedule, guest/submission CTAs.
- The People's Perspective: active weekly question, video/audio/photo/written response submission, published community highlights, privacy and release details.
- Meet the Crew: searchable profiles, roles, bios, show affiliations, optional approved social links and intro clips.
- Inside the 253: neighborhood stories, spotlight, story map, voice wall, events and local initiatives.
- Participate: guest applications, story ideas, volunteer contributor applications, photo/audio/video submissions.
- About / Contact: CrowRules ownership, editorial standards, accessibility, contact and corrections.

## Visual system
- Palette: near-black / charcoal, cold Pacific blue, muted silver, controlled crimson, restrained warm gold.
- Typography: Manrope display + DM Sans body (existing fonts).
- Photography: actual Tacoma skyline, Thea Foss Waterway, waterfront, Narrows Bridge, neighborhood streets, Mount Rainier and real raven wildlife.
- Hero art should use licensed / permission-cleared photography. Keep source/creator/license credits in the footer or image caption.
- Avoid generic stock collages, cartoon birds, excessive red glow, and text baked into images.
- Motion: subtle parallax, slow image drift, restrained reveal transitions; respect prefers-reduced-motion and avoid autoplay audio.
- Mobile-first: collapsible nav, stacked hero, 1-column cards, upload progress, touch-friendly controls.

## Core pages and routes
- / index.html — homepage
- /watch/ — network and live player (existing /live/ remains linked)
- /shows/ — show directory
- /shows/tacoma-nights/ — flagship show detail
- /crew/ — approved crew directory
- /crew/profile.html?slug=... — crew profile detail
- /people-perspective/ — Question of the Week and submission portal
- /episodes/ — archive (existing route retained)
- /the-253/ — community hub (existing route retained)
- /inside-the-253/ — editorial discovery landing
- /participate/ — submission and involvement directory
- /control-room/people-perspective/ — staff-only moderation interface
Existing URLs such as /perspectives/, /newsroom/, /guest-lounge/, /contributors/, /studio/ and /control-room/ remain functional.

## The People's Perspective workflow
1. Producer creates/activates one weekly question with open/close timestamps and optional episode association.
2. Visitor selects video, audio, photo, or written response.
3. Browser validates MIME type and size, uploads the media to a private Supabase Storage bucket, and inserts a pending `tn_submissions` row with a storage object path in metadata.
4. Submission remains private; public users cannot list or download objects.
5. Staff member reviews the submission, creates a short-lived signed URL for preview, checks consent/release, and marks it in review / approved / rejected / published.
6. Only separately curated, approved/published media is copied or referenced in public content. Never render raw unreviewed submissions publicly.
7. Staff can associate a submission with an episode and record the final published URL / credit in metadata.

### Submission guardrails
- Private bucket; no public object read policy.
- Public upload only to a constrained incoming folder, with MIME allowlist and a 150 MiB file-size cap.
- UI limits video to 150 MiB, audio to 30 MiB, photos to 15 MiB; enforce bucket maximum too.
- Add CAPTCHA / bot protection and rate limiting before broad public launch. Static GitHub Pages alone cannot provide reliable server-side rate limiting.
- Require explicit permission to review and potentially publish; provide separate guardian consent for minors. Do not promise anonymity if a face, voice, location, or metadata can identify the submitter.
- Strip EXIF metadata from public images before publishing; do not publish original uploads.
- Keep original uploads private and define a retention/deletion schedule.
- Avoid collecting unnecessary sensitive information. Email is optional unless the team needs to contact the submitter.

## Data model additions (additive only)
- `tn_weekly_questions`: question, slug, status, opens_at, closes_at, episode_slug, created_by, timestamps.
- `tn_people_profiles`: display name, slug, role, bio, avatar URL, show affiliations, optional links, intro video, display order, publication status.
- Existing `tn_submissions`: reuse allowed `community-submit` type; store category, question id, media type, bucket id, object path, consent flags, and episode association in metadata. Do not add a new value to the existing submission_type check constraint.
- Storage bucket: `tn-community-submissions`, private.

## Administration
- Existing Control Room remains the staff entry point.
- New People’s Perspective moderation page uses the existing `tn_is_staff()` authorization model and authenticated session.
- Signed URLs are short-lived and generated only after staff authorization.
- Add filters for pending / in review / approved / rejected / published, question, media type, and date.
- Provide safe actions: mark in review, approve, reject, publish; never auto-publish.
- Crew profile and weekly-question editing should be staff-only and must not let public users self-assign roles.

## Release plan
### Release A — Foundation and visual shell
- Create a working branch; preserve main.
- Establish shared v2 design tokens, photography rules, nav and footer.
- Rebuild homepage and add show / crew / perspective entry points.
- Verify desktop and mobile; verify every relative link under GitHub Pages project path.

### Release B — Content discovery
- Show directory and detailed show pages.
- Episode archive filters and metadata.
- Crew directory and profile details.
- Latest content and featured editorial modules from published records only.

### Release C — Community submission
- Weekly question management.
- Multi-format upload UI with progress and validation.
- Private Storage bucket and RLS.
- Consent capture and moderation dashboard.
- Staff signed-URL preview and audit trail.

### Release D — Production integration
- Episode association, approved clip packaging, crew assignment, production notes.
- Connect to existing Studio/Control Room using links and safe public content references only.
- No direct change to OBS/Streamlabs/bridge control APIs.

### Release E — Quality, accessibility and launch
- Playwright smoke tests for routes, responsive navigation and forms.
- Test anonymous upload, private object denial, staff signed preview, approval, rejection, publication.
- Test keyboard navigation, labels, focus states, contrast, captions, reduced motion and upload errors.
- Verify no secrets in built assets; check console, network failures, broken links and mobile layout.
- Roll out on branch/preview first; merge to main only after approval and production Supabase migration review.

## Acceptance criteria
- Existing Studio and Control Room URLs still load and retain their workflows.
- Homepage is cinematic and unmistakably Tacoma; image credits and licensing are clear.
- Every show has a useful detail page and current episode links.
- Crew profiles are published only by staff.
- Every public submission enters private storage and a pending moderation state.
- No visitor can list/read private submission objects or access staff pages.
- No unreviewed submission appears on public pages.
- All pages are responsive, keyboard-accessible, and functional at the GitHub Pages base path.
