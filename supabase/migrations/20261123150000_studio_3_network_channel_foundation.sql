-- Studio 3.0 multi-channel foundation.
-- Additive only: existing records remain unassigned (NULL) and retain current behavior.

create table if not exists public.network_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel_key text not null,
  name text not null,
  description text not null default '',
  status text not null default 'active'
    check (status in ('active','coming_soon','paused','archived')),
  operating_mode text not null default 'both'
    check (operating_mode in ('single','multiple','both')),
  distribution_mode text not null default 'youtube_and_website'
    check (distribution_mode in ('youtube','website','youtube_and_website')),
  website_path text,
  youtube_channel_id text,
  youtube_playlist_id text,
  logo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, channel_key),
  unique (owner_id, id),
  check (channel_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

alter table public.network_channels enable row level security;
revoke all on public.network_channels from anon;
grant select, insert, update, delete on public.network_channels to authenticated;

drop policy if exists "network channels owner manages" on public.network_channels;
create policy "network channels owner manages"
  on public.network_channels
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

alter table public.live_network_programs
  add column if not exists channel_id uuid references public.network_channels(id) on delete set null;
alter table public.live_network_schedule
  add column if not exists channel_id uuid references public.network_channels(id) on delete set null;
alter table public.live_network_playout_queue
  add column if not exists channel_id uuid references public.network_channels(id) on delete set null;
alter table public.live_network_public_schedule
  add column if not exists channel_id uuid references public.network_channels(id) on delete set null;

create index if not exists network_channels_owner_sort_idx
  on public.network_channels (owner_id, sort_order, name);
create index if not exists live_network_programs_channel_idx
  on public.live_network_programs (owner_id, channel_id);
create index if not exists live_network_schedule_channel_start_idx
  on public.live_network_schedule (owner_id, channel_id, starts_at);
create index if not exists live_network_playout_queue_channel_idx
  on public.live_network_playout_queue (owner_id, channel_id, scheduled_at);
