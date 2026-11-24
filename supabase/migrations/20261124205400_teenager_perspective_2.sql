-- Teenager Perspective 2.0 — isolated schema, moderation, and storage policies.
create table if not exists public.teen_perspective_submissions (
 id uuid primary key default gen_random_uuid(), content_type text not null check(content_type in ('audio','video','written')),
 display_name text not null default 'Community Voice' check(char_length(display_name) between 1 and 60),
 title text not null check(char_length(title) between 3 and 140), topic text not null default 'Open perspective' check(char_length(topic)<=80),
 body text not null default '' check(char_length(body)<=3000),
 media_bucket text check(media_bucket is null or media_bucket in ('tacoma-nights-clips','teenager-perspective-media')), media_path text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now(),
 constraint teen_perspective_media_pair check((media_bucket is null and media_path is null) or (media_bucket is not null and media_path is not null and char_length(media_path) between 1 and 500))
);
create index if not exists teen_perspective_submissions_status_created_idx on public.teen_perspective_submissions(status,created_at desc);
create table if not exists public.teen_perspective_consents (
 submission_id uuid primary key references public.teen_perspective_submissions(id) on delete cascade,
 participant_consent boolean not null check(participant_consent), guardian_consent boolean not null check(guardian_consent),
 publication_consent boolean not null check(publication_consent), consent_version text not null default 'teenager-perspective-2.0',
 created_at timestamptz not null default now()
);
create table if not exists public.teen_perspective_comments (
 id uuid primary key default gen_random_uuid(), parent_id uuid references public.teen_perspective_comments(id) on delete cascade,
 display_name text not null default 'Community Voice' check(char_length(display_name) between 1 and 60),
 comment_text text not null check(char_length(comment_text) between 3 and 1200),
 participant_consent boolean not null default false, guardian_consent boolean not null default false,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.teen_perspective_comments add column if not exists participant_consent boolean not null default false;
alter table public.teen_perspective_comments add column if not exists guardian_consent boolean not null default false;
create index if not exists teen_perspective_comments_status_created_idx on public.teen_perspective_comments(status,created_at desc);
create table if not exists public.teen_perspective_ratings (
 id uuid primary key default gen_random_uuid(), segment_key text not null default 'teenager-perspective' check(char_length(segment_key) between 1 and 80),
 rating smallint not null check(rating between 1 and 5), vote_key uuid not null, created_at timestamptz not null default now(), unique(segment_key,vote_key)
);
create index if not exists teen_perspective_ratings_segment_idx on public.teen_perspective_ratings(segment_key);
create table if not exists public.teen_perspective_reactions (
 id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.teen_perspective_comments(id) on delete cascade,
 reaction_type text not null check(reaction_type in ('helpful','heart','question')), vote_key uuid not null,
 created_at timestamptz not null default now(), unique(comment_id,reaction_type,vote_key)
);
create table if not exists public.teen_perspective_questions (
 id uuid primary key default gen_random_uuid(), prompt text not null check(char_length(prompt) between 8 and 300),
 category text not null default 'Generation' check(char_length(category)<=60), is_featured boolean not null default false,
 status text not null default 'draft' check(status in ('draft','published','archived')), starts_at timestamptz, ends_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists teen_perspective_questions_live_idx on public.teen_perspective_questions(status,is_featured desc,created_at desc);
create table if not exists public.teen_perspective_answers (
 id uuid primary key default gen_random_uuid(), question_id uuid not null references public.teen_perspective_questions(id) on delete cascade,
 display_name text not null default 'Community Voice' check(char_length(display_name) between 1 and 60),
 answer_text text not null check(char_length(answer_text) between 3 and 1600),
 participant_consent boolean not null default false, guardian_consent boolean not null default false,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists teen_perspective_answers_question_idx on public.teen_perspective_answers(question_id,status,created_at desc);
alter table public.teen_perspective_submissions enable row level security;
alter table public.teen_perspective_consents enable row level security;
alter table public.teen_perspective_comments enable row level security;
alter table public.teen_perspective_ratings enable row level security;
alter table public.teen_perspective_reactions enable row level security;
alter table public.teen_perspective_questions enable row level security;
alter table public.teen_perspective_answers enable row level security;
drop policy if exists "Teen perspective public approved read" on public.teen_perspective_submissions;
create policy "Teen perspective public approved read" on public.teen_perspective_submissions for select to anon,authenticated using(status='approved' or public.tn_is_staff());
drop policy if exists "Teen perspective public pending insert" on public.teen_perspective_submissions;
create policy "Teen perspective public pending insert" on public.teen_perspective_submissions for insert to anon,authenticated with check(status='pending' and reviewed_by is null and reviewed_at is null and (media_bucket is null or media_bucket='tacoma-nights-clips') and (media_path is null or media_path like 'teenager-inbox/%'));
drop policy if exists "Teen perspective staff update" on public.teen_perspective_submissions;
create policy "Teen perspective staff update" on public.teen_perspective_submissions for update to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
drop policy if exists "Teen perspective consent insert" on public.teen_perspective_consents;
create policy "Teen perspective consent insert" on public.teen_perspective_consents for insert to anon,authenticated with check(participant_consent and guardian_consent and publication_consent);
drop policy if exists "Teen perspective staff consent read" on public.teen_perspective_consents;
create policy "Teen perspective staff consent read" on public.teen_perspective_consents for select to authenticated using(public.tn_is_staff());
drop policy if exists "Teen perspective comments approved read" on public.teen_perspective_comments;
create policy "Teen perspective comments approved read" on public.teen_perspective_comments for select to anon,authenticated using(status='approved' or public.tn_is_staff());
drop policy if exists "Teen perspective comments pending insert" on public.teen_perspective_comments;
create policy "Teen perspective comments pending insert" on public.teen_perspective_comments for insert to anon,authenticated with check(status='pending' and reviewed_by is null and reviewed_at is null and participant_consent and guardian_consent and (parent_id is null or exists(select 1 from public.teen_perspective_comments parent where parent.id=parent_id and parent.status='approved')));
drop policy if exists "Teen perspective staff comments update" on public.teen_perspective_comments;
create policy "Teen perspective staff comments update" on public.teen_perspective_comments for update to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
drop policy if exists "Teen perspective ratings read aggregate source" on public.teen_perspective_ratings;
create policy "Teen perspective ratings read aggregate source" on public.teen_perspective_ratings for select to anon,authenticated using(true);
drop policy if exists "Teen perspective ratings insert" on public.teen_perspective_ratings;
create policy "Teen perspective ratings insert" on public.teen_perspective_ratings for insert to anon,authenticated with check(rating between 1 and 5);
drop policy if exists "Teen perspective reactions read aggregate source" on public.teen_perspective_reactions;
create policy "Teen perspective reactions read aggregate source" on public.teen_perspective_reactions for select to anon,authenticated using(true);
drop policy if exists "Teen perspective reactions insert" on public.teen_perspective_reactions;
create policy "Teen perspective reactions insert" on public.teen_perspective_reactions for insert to anon,authenticated with check(exists(select 1 from public.teen_perspective_comments c where c.id=comment_id and c.status='approved'));
drop policy if exists "Teen perspective questions published read" on public.teen_perspective_questions;
create policy "Teen perspective questions published read" on public.teen_perspective_questions for select to anon,authenticated using(status='published' or public.tn_is_staff());
drop policy if exists "Teen perspective questions staff manage" on public.teen_perspective_questions;
create policy "Teen perspective questions staff manage" on public.teen_perspective_questions for all to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
drop policy if exists "Teen perspective answers approved read" on public.teen_perspective_answers;
create policy "Teen perspective answers approved read" on public.teen_perspective_answers for select to anon,authenticated using(status='approved' or public.tn_is_staff());
drop policy if exists "Teen perspective answers pending insert" on public.teen_perspective_answers;
create policy "Teen perspective answers pending insert" on public.teen_perspective_answers for insert to anon,authenticated with check(status='pending' and participant_consent and guardian_consent and reviewed_by is null and reviewed_at is null);
drop policy if exists "Teen perspective answers staff update" on public.teen_perspective_answers;
create policy "Teen perspective answers staff update" on public.teen_perspective_answers for update to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
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
revoke all on public.teen_perspective_questions from anon,authenticated;
grant select(id,prompt,category,is_featured,status,starts_at,ends_at,created_at) on public.teen_perspective_questions to anon,authenticated;
grant insert,update,delete on public.teen_perspective_questions to authenticated;
grant select(id,question_id,display_name,answer_text,status,reviewed_at,created_at) on public.teen_perspective_answers to anon,authenticated;
grant insert(question_id,display_name,answer_text,participant_consent,guardian_consent) on public.teen_perspective_answers to anon,authenticated;
grant update(status,reviewed_by,reviewed_at) on public.teen_perspective_answers to authenticated;
create or replace view public.teen_perspective_rating_summary with(security_invoker=true) as select segment_key,round(avg(rating)::numeric,2) average_rating,count(*)::bigint rating_count from public.teen_perspective_ratings group by segment_key;
grant select on public.teen_perspective_rating_summary to anon,authenticated;
create or replace view public.teen_perspective_reaction_summary with(security_invoker=true) as select comment_id,reaction_type,count(*)::bigint reaction_count from public.teen_perspective_reactions group by comment_id,reaction_type;
grant select on public.teen_perspective_reaction_summary to anon,authenticated;
drop policy if exists "Teen perspective public private-inbox upload" on storage.objects;
create policy "Teen perspective public private-inbox upload" on storage.objects for insert to anon,authenticated with check(bucket_id='tacoma-nights-clips' and (storage.foldername(name))[1]='teenager-inbox');
drop policy if exists "Teen perspective staff private-inbox read" on storage.objects;
create policy "Teen perspective staff private-inbox read" on storage.objects for select to authenticated using(bucket_id='tacoma-nights-clips' and (storage.foldername(name))[1]='teenager-inbox' and public.tn_is_staff());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('teenager-perspective-media','teenager-perspective-media',true,104857600,array['audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/x-m4a','video/mp4','video/webm','video/quicktime']) on conflict(id) do nothing;
drop policy if exists "Teen perspective staff publish media" on storage.objects;
create policy "Teen perspective staff publish media" on storage.objects for insert to authenticated with check(bucket_id='teenager-perspective-media' and (storage.foldername(name))[1]='teenager-approved' and public.tn_is_staff());
insert into public.teen_perspective_questions(prompt,category,is_featured,status)
select 'What do adults misunderstand about teenagers?','Generation',true,'published'
where not exists(select 1 from public.teen_perspective_questions where status='published' and prompt='What do adults misunderstand about teenagers?');
