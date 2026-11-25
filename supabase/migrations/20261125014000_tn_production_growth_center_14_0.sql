create table if not exists public.tn_production_growth_goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 goal_title text not null,
 skill_area text not null,
 target_date date,
 status text not null default 'planned',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint tn_growth_goal_title_length check (char_length(btrim(goal_title)) between 3 and 160),
 constraint tn_growth_skill_area_length check (char_length(btrim(skill_area)) between 2 and 80),
 constraint tn_growth_goal_status check (status in ('planned','in_progress','completed','paused')),
 constraint tn_growth_notes_length check (notes is null or char_length(notes) <= 2000)
);
create index if not exists tn_growth_goals_user_updated_idx on public.tn_production_growth_goals(user_id, updated_at desc);
alter table public.tn_production_growth_goals enable row level security;
drop policy if exists "tn growth goals read own or admin" on public.tn_production_growth_goals;
create policy "tn growth goals read own or admin" on public.tn_production_growth_goals for select to authenticated using (user_id = auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn growth goals insert own member" on public.tn_production_growth_goals;
create policy "tn growth goals insert own member" on public.tn_production_growth_goals for insert to authenticated with check (user_id = auth.uid() and (select private.tn_production_is_member()));
drop policy if exists "tn growth goals update own or admin" on public.tn_production_growth_goals;
create policy "tn growth goals update own or admin" on public.tn_production_growth_goals for update to authenticated using (user_id = auth.uid() or (select private.tn_production_is_admin())) with check (user_id = auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn growth goals delete own or admin" on public.tn_production_growth_goals;
create policy "tn growth goals delete own or admin" on public.tn_production_growth_goals for delete to authenticated using (user_id = auth.uid() or (select private.tn_production_is_admin()));
comment on table public.tn_production_growth_goals is 'Private contributor development goals; visible to the owner and production administrators.';
comment on column public.tn_production_growth_goals.status is 'planned, in_progress, completed, or paused';