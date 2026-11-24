
revoke all on table public.teen_perspective_submissions from anon,authenticated,public;
revoke all on table public.teen_perspective_consents from anon,authenticated,public;
revoke all on table public.teen_perspective_comments from anon,authenticated,public;
revoke all on table public.teen_perspective_ratings from anon,authenticated,public;
revoke all on table public.teen_perspective_reactions from anon,authenticated,public;
revoke all on table public.teen_perspective_questions from anon,authenticated,public;
revoke all on table public.teen_perspective_answers from anon,authenticated,public;
revoke all on table public.teen_perspective_rating_summary from anon,authenticated,public;
revoke all on table public.teen_perspective_reaction_summary from anon,authenticated,public;

grant select(id,content_type,display_name,title,topic,body,media_bucket,media_path,status,created_at,reviewed_at) on public.teen_perspective_submissions to anon,authenticated;
grant insert(id,content_type,display_name,title,topic,body,media_bucket,media_path) on public.teen_perspective_submissions to anon,authenticated;
grant update(status,reviewed_by,reviewed_at,media_bucket,media_path) on public.teen_perspective_submissions to authenticated;

grant insert(submission_id,participant_consent,guardian_consent,publication_consent,consent_version) on public.teen_perspective_consents to anon,authenticated;
grant select on public.teen_perspective_consents to authenticated;

grant select(id,parent_id,display_name,comment_text,status,created_at) on public.teen_perspective_comments to anon,authenticated;
grant insert(parent_id,display_name,comment_text,participant_consent,guardian_consent) on public.teen_perspective_comments to anon,authenticated;
grant update(status,reviewed_by,reviewed_at) on public.teen_perspective_comments to authenticated;

grant select(segment_key,rating) on public.teen_perspective_ratings to anon,authenticated;
grant insert(segment_key,rating,vote_key) on public.teen_perspective_ratings to anon,authenticated;
grant select(comment_id,reaction_type) on public.teen_perspective_reactions to anon,authenticated;
grant insert(comment_id,reaction_type,vote_key) on public.teen_perspective_reactions to anon,authenticated;

grant select(id,prompt,category,is_featured,status,starts_at,ends_at,created_at) on public.teen_perspective_questions to anon,authenticated;
grant insert,update,delete on public.teen_perspective_questions to authenticated;

grant select(id,question_id,display_name,answer_text,status,reviewed_at,created_at) on public.teen_perspective_answers to anon,authenticated;
grant insert(question_id,display_name,answer_text,participant_consent,guardian_consent) on public.teen_perspective_answers to anon,authenticated;
grant update(status,reviewed_by,reviewed_at) on public.teen_perspective_answers to authenticated;

grant select on public.teen_perspective_rating_summary to anon,authenticated;
grant select on public.teen_perspective_reaction_summary to anon,authenticated;
