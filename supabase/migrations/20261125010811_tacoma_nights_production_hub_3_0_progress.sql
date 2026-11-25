alter table public.tn_production_recognition add column if not exists recipient_name text not null default 'Team member';
create table if not exists public.tn_production_training_progress (
 id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.tn_production_training(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, completed_at timestamptz not null default now(), unique(resource_id,user_id)
);
alter table public.tn_production_training_progress enable row level security;
grant select,insert,update,delete on public.tn_production_training_progress to authenticated;
create policy "tn training progress own read" on public.tn_production_training_progress for select to authenticated using (user_id=(select auth.uid()) or (select private.tn_production_is_admin()));
create policy "tn training progress own insert" on public.tn_production_training_progress for insert to authenticated with check (user_id=(select auth.uid()) and (select private.tn_production_is_member()));
create policy "tn training progress own update" on public.tn_production_training_progress for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "tn training progress admin read" on public.tn_production_training_progress for select to authenticated using ((select private.tn_production_is_admin()));
