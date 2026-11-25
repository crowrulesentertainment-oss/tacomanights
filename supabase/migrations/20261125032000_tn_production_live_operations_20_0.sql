create table if not exists public.tn_production_live_runs (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null unique references public.tn_production_episodes(id) on delete cascade,
 run_status text not null default 'planning' check(run_status in ('planning','ready','live','wrapped','cancelled')),
 scheduled_at timestamptz,
 expected_duration_minutes integer not null default 60 check(expected_duration_minutes between 1 and 480),
 segments jsonb not null default '[]'::jsonb check(jsonb_typeof(segments)='array'),
 host_assignments jsonb not null default '[]'::jsonb check(jsonb_typeof(host_assignments)='array'),
 guest_checkins jsonb not null default '[]'::jsonb check(jsonb_typeof(guest_checkins)='array'),
 production_notes text check(production_notes is null or char_length(production_notes)<=5000),
 current_segment_index integer not null default 0 check(current_segment_index>=0),
 started_at timestamptz,
 wrapped_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.tn_production_live_runs enable row level security;
drop policy if exists "tn live runs member read" on public.tn_production_live_runs;
create policy "tn live runs member read" on public.tn_production_live_runs for select to authenticated using(private.tn_production_is_member());
drop policy if exists "tn live runs admin insert" on public.tn_production_live_runs;
create policy "tn live runs admin insert" on public.tn_production_live_runs for insert to authenticated with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn live runs admin update" on public.tn_production_live_runs;
create policy "tn live runs admin update" on public.tn_production_live_runs for update to authenticated using(private.tn_production_is_admin()) with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn live runs admin delete" on public.tn_production_live_runs;
create policy "tn live runs admin delete" on public.tn_production_live_runs for delete to authenticated using(private.tn_production_is_admin());
create index if not exists tn_production_live_runs_status_idx on public.tn_production_live_runs(run_status,scheduled_at);
comment on table public.tn_production_live_runs is 'Producer-controlled live show run sheets, host assignments, segment timings, guest check-ins and live status.';