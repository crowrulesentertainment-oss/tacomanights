# Tacoma Nights Community 2.0 — Phase 2 setup and QA

## Branch and scope
All work is isolated on \`tacoma-nights-community-2-0\`. No production files are deployed and no Supabase migration has been applied. Existing Tacoma Nights tables and policies are not intentionally modified.

## Database migration
Review \`supabase/migrations/202611160001_tacoma_nights_community_2_0.sql\` in full before applying. It creates the community tables, reply threading, reactions, reports, aggregate poll totals table, admin authorization function, and private People's Mic bucket/policies. It is designed to be repeatable.

**Do not put a service-role key in browser code.** Set the administrator claim only through a trusted Supabase administrative process:
- \`app_metadata.role = "admin"\`, or
- \`app_metadata.tacoma_nights_admin = true\`

Do not set authorization claims in user-editable \`user_metadata\`.

## Phase 2 features in this branch
- Forum replies with parent-reply threading.
- Helpful / Like / Support reactions and member reporting.
- One-vote-per-member polls with aggregate result counts.
- Admin publishing for polls, clips, watch parties, behind-the-episode updates, recognition, and official events.
- Admin queue for items, reports, replies, hide/restore, reject, approve and delete.
- 253 Community Pulse counters and latest published activity.
- People's Mic upload paths scoped to the authenticated user's own folder.

## Private video
The bucket is private. The browser upload path is \`peoples-mic/<auth.uid()>/<random-file>\`. Admin review should use short-lived signed URLs generated after authorization; never publish storage paths or public URLs.

## Production QA checklist
1. Anonymous visitor: can read published items, published replies, reactions and poll totals; cannot submit, vote, react, or report.
2. Member A: can submit pending items, reply to published forum threads, vote once per poll, react, report once per item, upload a private recording to their own folder.
3. Member B: cannot read Member A's private video object or pending submission; cannot upload into Member A's folder; cannot moderate.
4. Admin: can review submissions, approve/reject/hide/delete items, hide/restore replies, review/dismiss reports, create published content and polls, and access private recordings through short-lived signed URLs.
5. Poll validation: reject invalid option indices and prevent duplicate votes.
6. Reply validation: reject replies to unpublished/non-forum items and cross-thread parent IDs.
7. Poll privacy: anonymous and authenticated clients can read only aggregate totals; they cannot read other members' individual votes.
8. Verify trigger-maintained poll totals after insert and delete, including duplicate-vote rejection.
9. Responsive browser tests: current Chrome/Edge, Safari/iOS, Firefox; camera permission denied, no camera, interrupted recording, network failure, and upload failure.
10. Regression: verify existing episode archive, weekly question, member sign-in, existing admin/control room, premiere countdown and existing Supabase tables/policies remain unchanged.

## Known boundaries
- This branch has not been browser-tested against real anonymous/member/admin accounts.
- No migration has been run.
- No production deployment or merge has occurred.
- Admin video playback and signed-URL review UI remain a QA item; object access is private and must not be exposed as a public link.
