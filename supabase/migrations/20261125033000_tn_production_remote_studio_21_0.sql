create table if not exists public.tn_production_remote_sessions (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null unique references public.tn_production_episodes(id) on delete cascade,
 session_status text not null default 'planned' check(session_status in ('planned','invited','ready','recording','recorded','cancelled')),
 scheduled_at timestamptz,
 platform text check(platform is null or char_length(platform)<=120),
 meeting_url text check(meeting_url is null or (meeting_url ~ '^https://[^[:space:]]+$' and char_length(meeting_url)<=2048)),
 recording_format text not null default 'horizontal_16_9' check(recording_format in ('horizontal_16_9','audio_only','other')),
 participants jsonb not null default '[]'::jsonb check(jsonb_typeof(participants)='array'),
 technical_checks jsonb not null default '{}'::jsonb check(jsonb_typeof(technical_checks)='object'),
 deliverables jsonb not null default '[]'::jsonb check(jsonb_typeof(deliverables)='array'),
 session_notes text check(session_notes is null or char_length(session_notes)<=5000),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.tn_production_remote_sessions enable row level security;
drop policy if exists "tn remote sessions member read" on public.tn_production_remote_sessions;
create policy "tn remote sessions member read" on public.tn_production_remote_sessions for select to authenticated using(private.tn_production_is_member());
drop policy if exists "tn remote sessions admin insert" on public.tn_production_remote_sessions;
create policy "tn remote sessions admin insert" on public.tn_production_remote_sessions for insert to authenticated with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn remote sessions admin update" on public.tn_production_remote_sessions;
create policy "tn remote sessions admin update" on public.tn_production_remote_sessions for update to authenticated using(private.tn_production_is_admin()) with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn remote sessions admin delete" on public.tn_production_remote_sessions;
create policy "tn remote sessions admin delete" on public.tn_production_remote_sessions for delete to authenticated using(private.tn_production_is_admin());
create index if not exists tn_production_remote_sessions_status_idx on public.tn_production_remote_sessions(session_status,scheduled_at);
comment on table public.tn_production_remote_sessions is 'Remote recording coordination, participant readiness, technical checks and segment delivery tracking.';