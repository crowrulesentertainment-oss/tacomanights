create table if not exists public.tn_production_release_control (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null unique references public.tn_production_episodes(id) on delete cascade,
 youtube_title text,
 youtube_description text,
 youtube_tags text[] not null default '{}',
 video_url text check(video_url is null or video_url ~ '^https://'),
 thumbnail_url text check(thumbnail_url is null or thumbnail_url ~ '^https://'),
 youtube_video_id text,
 visibility text not null default 'private' check(visibility in ('private','unlisted','public')),
 release_status text not null default 'draft' check(release_status in ('draft','ready','scheduled','published','paused')),
 release_checklist jsonb not null default '{}'::jsonb check(jsonb_typeof(release_checklist)='object'),
 scheduled_at timestamptz,
 published_at timestamptz,
 release_notes text check(release_notes is null or char_length(release_notes)<=4000),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint tn_release_tags_limit check(cardinality(youtube_tags)<=30),
 constraint tn_release_video_id_length check(youtube_video_id is null or char_length(youtube_video_id)<=80)
);
alter table public.tn_production_release_control enable row level security;
drop policy if exists "tn release member read" on public.tn_production_release_control;
create policy "tn release member read" on public.tn_production_release_control for select to authenticated using(private.tn_production_is_member());
drop policy if exists "tn release admin insert" on public.tn_production_release_control;
create policy "tn release admin insert" on public.tn_production_release_control for insert to authenticated with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn release admin update" on public.tn_production_release_control;
create policy "tn release admin update" on public.tn_production_release_control for update to authenticated using(private.tn_production_is_admin()) with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn release admin delete" on public.tn_production_release_control;
create policy "tn release admin delete" on public.tn_production_release_control for delete to authenticated using(private.tn_production_is_admin());
create index if not exists tn_production_release_status_idx on public.tn_production_release_control(release_status,scheduled_at);
comment on table public.tn_production_release_control is 'Producer-controlled YouTube release metadata, checklist, scheduling and publishing records.';