-- Public EPG projection. Private producer schedule remains private; only explicitly listed rows are copied.
alter table public.live_network_schedule
  add column if not exists is_public boolean not null default false;

create table if not exists public.live_network_public_schedule (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_schedule_id uuid not null,
  program_title text not null,
  program_description text,
  category text,
  format text,
  host_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','ready','on_air')),
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (owner_id, source_schedule_id),
  check (ends_at > starts_at)
);

alter table public.live_network_public_schedule enable row level security;
grant select (program_title, program_description, category, format, host_name, starts_at, ends_at, status, updated_at) on public.live_network_public_schedule to anon;
grant select, insert, update, delete on public.live_network_public_schedule to authenticated;

create policy "published network schedule is public"
  on public.live_network_public_schedule
  for select
  to anon, authenticated
  using (is_published = true or (select auth.uid()) = owner_id);

create policy "network schedule owner manages projection"
  on public.live_network_public_schedule
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create index if not exists live_network_public_schedule_starts_idx
  on public.live_network_public_schedule (starts_at)
  where is_published = true;
