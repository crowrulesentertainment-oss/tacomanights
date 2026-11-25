-- Tacoma Nights Production Hub 16.0: private collaboration workspaces.
create table if not exists public.tn_production_collab_groups (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 3 and 100),
 description text not null default '' check (char_length(description) <= 1200),
 group_type text not null default 'project' check (group_type in ('project','mentorship','episode','crew')),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.tn_production_collab_members (
 group_id uuid not null references public.tn_production_collab_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 added_by uuid not null references auth.users(id) on delete restrict,
 joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create table if not exists public.tn_production_collab_messages (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.tn_production_collab_groups(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete restrict,
 message text not null check (char_length(btrim(message)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create table if not exists public.tn_production_collab_milestones (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.tn_production_collab_groups(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 3 and 160),
 details text check (details is null or char_length(details) <= 1200),
 due_date date,
 status text not null default 'planned' check (status in ('planned','in_progress','completed','blocked')),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists tn_collab_members_user_idx on public.tn_production_collab_members(user_id);
create index if not exists tn_collab_messages_group_created_idx on public.tn_production_collab_messages(group_id,created_at desc);
create index if not exists tn_collab_milestones_group_due_idx on public.tn_production_collab_milestones(group_id,due_date);
alter table public.tn_production_collab_groups enable row level security;
alter table public.tn_production_collab_members enable row level security;
alter table public.tn_production_collab_messages enable row level security;
alter table public.tn_production_collab_milestones enable row level security;
drop policy if exists "tn collab groups admin create" on public.tn_production_collab_groups;
create policy "tn collab groups admin create" on public.tn_production_collab_groups for insert to authenticated with check (private.tn_production_is_admin() and created_by=auth.uid());
drop policy if exists "tn collab groups member read" on public.tn_production_collab_groups;
create policy "tn collab groups member read" on public.tn_production_collab_groups for select to authenticated using (private.tn_production_is_admin() or exists(select 1 from public.tn_production_collab_members m where m.group_id=id and m.user_id=auth.uid()));
drop policy if exists "tn collab groups admin update" on public.tn_production_collab_groups;
create policy "tn collab groups admin update" on public.tn_production_collab_groups for update to authenticated using(private.tn_production_is_admin()) with check(private.tn_production_is_admin());
drop policy if exists "tn collab groups admin delete" on public.tn_production_collab_groups;
create policy "tn collab groups admin delete" on public.tn_production_collab_groups for delete to authenticated using(private.tn_production_is_admin());
drop policy if exists "tn collab members self or admin read" on public.tn_production_collab_members;
create policy "tn collab members self or admin read" on public.tn_production_collab_members for select to authenticated using(user_id=auth.uid() or private.tn_production_is_admin());
drop policy if exists "tn collab members admin add" on public.tn_production_collab_members;
create policy "tn collab members admin add" on public.tn_production_collab_members for insert to authenticated with check(private.tn_production_is_admin() and added_by=auth.uid() and exists(select 1 from public.tn_production_collab_groups g where g.id=group_id));
drop policy if exists "tn collab members admin remove" on public.tn_production_collab_members;
create policy "tn collab members admin remove" on public.tn_production_collab_members for delete to authenticated using(private.tn_production_is_admin());
drop policy if exists "tn collab messages group read" on public.tn_production_collab_messages;
create policy "tn collab messages group read" on public.tn_production_collab_messages for select to authenticated using(private.tn_production_is_admin() or exists(select 1 from public.tn_production_collab_members m where m.group_id=tn_production_collab_messages.group_id and m.user_id=auth.uid()));
drop policy if exists "tn collab messages member send" on public.tn_production_collab_messages;
create policy "tn collab messages member send" on public.tn_production_collab_messages for insert to authenticated with check(sender_id=auth.uid() and private.tn_production_is_member() and exists(select 1 from public.tn_production_collab_members m where m.group_id=tn_production_collab_messages.group_id and m.user_id=auth.uid()));
drop policy if exists "tn collab milestones group read" on public.tn_production_collab_milestones;
create policy "tn collab milestones group read" on public.tn_production_collab_milestones for select to authenticated using(private.tn_production_is_admin() or exists(select 1 from public.tn_production_collab_members m where m.group_id=tn_production_collab_milestones.group_id and m.user_id=auth.uid()));
drop policy if exists "tn collab milestones member create" on public.tn_production_collab_milestones;
create policy "tn collab milestones member create" on public.tn_production_collab_milestones for insert to authenticated with check(created_by=auth.uid() and private.tn_production_is_member() and exists(select 1 from public.tn_production_collab_members m where m.group_id=tn_production_collab_milestones.group_id and m.user_id=auth.uid()));
drop policy if exists "tn collab milestones owner or admin update" on public.tn_production_collab_milestones;
create policy "tn collab milestones owner or admin update" on public.tn_production_collab_milestones for update to authenticated using(created_by=auth.uid() or private.tn_production_is_admin()) with check(created_by=auth.uid() or private.tn_production_is_admin());
drop policy if exists "tn collab milestones admin delete" on public.tn_production_collab_milestones;
create policy "tn collab milestones admin delete" on public.tn_production_collab_milestones for delete to authenticated using(private.tn_production_is_admin());
comment on table public.tn_production_collab_groups is 'Private Tacoma Nights collaboration workspaces; visible only to assigned members and production admins.';
comment on table public.tn_production_collab_messages is 'Messages scoped to private collaboration group membership.';
comment on table public.tn_production_collab_milestones is 'Shared project and development milestones for collaboration groups.';