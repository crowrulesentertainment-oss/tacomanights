create table if not exists public.tn_production_episode_qc (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null unique references public.tn_production_episodes(id) on delete cascade,
 checklist jsonb not null default '{}'::jsonb,
 technical_notes text check(technical_notes is null or char_length(technical_notes)<=3000),
 qc_status text not null default 'in_progress' check(qc_status in ('in_progress','ready_for_final_review','changes_requested','approved')),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint tn_episode_qc_checklist_object check(jsonb_typeof(checklist)='object')
);
alter table public.tn_production_episode_qc enable row level security;
drop policy if exists "tn episode qc member read" on public.tn_production_episode_qc;
create policy "tn episode qc member read" on public.tn_production_episode_qc for select to authenticated using(private.tn_production_is_member());
drop policy if exists "tn episode qc admin insert" on public.tn_production_episode_qc;
create policy "tn episode qc admin insert" on public.tn_production_episode_qc for insert to authenticated with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn episode qc admin update" on public.tn_production_episode_qc;
create policy "tn episode qc admin update" on public.tn_production_episode_qc for update to authenticated using(private.tn_production_is_admin()) with check(private.tn_production_is_admin() and updated_by=auth.uid());
drop policy if exists "tn episode qc admin delete" on public.tn_production_episode_qc;
create policy "tn episode qc admin delete" on public.tn_production_episode_qc for delete to authenticated using(private.tn_production_is_admin());
create index if not exists tn_episode_qc_status_idx on public.tn_production_episode_qc(qc_status,updated_at desc);
comment on table public.tn_production_episode_qc is 'Producer-controlled technical quality checks and final publishing readiness for Tacoma Nights episodes.';