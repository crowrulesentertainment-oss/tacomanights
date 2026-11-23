-- Tacoma Nights 2.0 additive community submissions, weekly question and crew directory.
-- Review and apply in Supabase only after verifying current production schema and RLS.
-- Does not modify Studio, network schedule, playout, OBS, Streamlabs, or bridge tables.

create table if not exists public.tn_weekly_questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  question text not null,
  context text not null default '',
  status text not null default 'draft' check (status in ('draft','scheduled','active','closed','archived')),
  opens_at timestamptz,
  closes_at timestamptz,
  episode_slug text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tn_people_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  role_title text not null default '',
  department text not null default '',
  bio text not null default '',
  avatar_url text,
  intro_video_url text,
  show_affiliations text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tn_weekly_questions_active_idx
  on public.tn_weekly_questions(status, opens_at, closes_at);
create index if not exists tn_people_profiles_public_idx
  on public.tn_people_profiles(status, sort_order, display_name);

alter table public.tn_weekly_questions enable row level security;
alter table public.tn_people_profiles enable row level security;

drop policy if exists "tn weekly question public active read" on public.tn_weekly_questions;
create policy "tn weekly question public active read"
  on public.tn_weekly_questions for select to anon, authenticated
  using (status = 'active' and (opens_at is null or opens_at <= now()) and (closes_at is null or closes_at > now()));

drop policy if exists "tn weekly question staff manage" on public.tn_weekly_questions;
create policy "tn weekly question staff manage"
  on public.tn_weekly_questions for all to authenticated
  using (public.tn_is_staff()) with check (public.tn_is_staff());

drop policy if exists "tn crew public published read" on public.tn_people_profiles;
create policy "tn crew public published read"
  on public.tn_people_profiles for select to anon, authenticated
  using (status = 'published');

drop policy if exists "tn crew staff manage" on public.tn_people_profiles;
create policy "tn crew staff manage"
  on public.tn_people_profiles for all to authenticated
  using (public.tn_is_staff()) with check (public.tn_is_staff());

grant select on public.tn_weekly_questions to anon, authenticated;
grant insert, update, delete on public.tn_weekly_questions to authenticated;
grant select on public.tn_people_profiles to anon, authenticated;
grant insert, update, delete on public.tn_people_profiles to authenticated;

-- Private bucket: object names are random UUIDs under incoming/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tn-community-submissions',
  'tn-community-submissions',
  false,
  157286400,
  array[
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg',
    'image/jpeg','image/png','image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 157286400,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tn community upload incoming only" on storage.objects;
create policy "tn community upload incoming only"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'tn-community-submissions'
    and (storage.foldername(name))[1] = 'incoming'
    and array_length(storage.foldername(name), 1) >= 1
  );

drop policy if exists "tn community staff read private uploads" on storage.objects;
create policy "tn community staff read private uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'tn-community-submissions' and public.tn_is_staff());

-- Deliberately no anonymous SELECT, UPDATE, or DELETE policy on this private bucket.
-- Public inserts are constrained by bucket MIME and size limits. Add CAPTCHA and
-- server-side rate limiting before promoting the form broadly; GitHub Pages alone
-- cannot enforce robust per-IP limits.
