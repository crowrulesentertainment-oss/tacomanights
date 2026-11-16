-- Tacoma Nights Community 2.0 — additive, repeatable migration.
-- Review before applying. Does not modify existing Tacoma Nights tables or policies.
create extension if not exists pgcrypto;

create table if not exists public.tn_community_items (
 id uuid primary key default gen_random_uuid(),
 item_type text not null check (item_type in ('forum','spotlight','clip','profile','event','watch_party','behind_episode','recognition','poll','people_mic')),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 180),
 body text not null default '' check (char_length(body) <= 6000),
 category text,
 status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
 metadata jsonb not null default '{}'::jsonb,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists tn_community_items_type_status_created on public.tn_community_items(item_type,status,created_at desc);
create index if not exists tn_community_items_user on public.tn_community_items(user_id,created_at desc);

create table if not exists public.tn_community_replies (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.tn_community_items(id) on delete cascade,
 parent_reply_id uuid references public.tn_community_replies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(body) between 1 and 3000),
 status text not null default 'published' check (status in ('published','hidden')),
 created_at timestamptz not null default now()
);
alter table public.tn_community_replies add column if not exists parent_reply_id uuid references public.tn_community_replies(id) on delete cascade;
create index if not exists tn_community_replies_item on public.tn_community_replies(item_id,created_at);
create index if not exists tn_community_replies_parent on public.tn_community_replies(parent_reply_id);

create or replace function public.tn_validate_community_reply()
returns trigger language plpgsql security definer set search_path=public
as $$
declare parent_item uuid;
begin
 if not exists(select 1 from public.tn_community_items i where i.id=new.item_id and i.item_type='forum' and i.status='published') then
  raise exception 'Replies can only be added to published forum discussions';
 end if;
 if new.parent_reply_id is not null then
  select item_id into parent_item from public.tn_community_replies where id=new.parent_reply_id and status='published';
  if parent_item is distinct from new.item_id then raise exception 'A reply must belong to the same discussion as its parent'; end if;
 end if;
 return new;
end $$;
drop trigger if exists tn_validate_community_reply on public.tn_community_replies;
create trigger tn_validate_community_reply before insert or update of item_id,parent_reply_id on public.tn_community_replies for each row execute function public.tn_validate_community_reply();

create table if not exists public.tn_community_votes (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.tn_community_items(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 option_index integer not null check(option_index >= 0),
 created_at timestamptz not null default now(),
 unique(item_id,user_id)
);
create table if not exists public.tn_community_reactions (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.tn_community_items(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('helpful','like','support')),
 created_at timestamptz not null default now(),
 unique(item_id,user_id,reaction)
);
create table if not exists public.tn_community_reports (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.tn_community_items(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(reason) between 3 and 500),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(item_id,reporter_id)
);
alter table public.tn_community_reports add column if not exists reviewed_by uuid references auth.users(id);
alter table public.tn_community_reports add column if not exists reviewed_at timestamptz;

create or replace function public.tn_is_community_admin()
returns boolean language sql stable security definer set search_path=public,auth
as $$
 select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false)
     or coalesce((auth.jwt()->'app_metadata'->>'tacoma_nights_admin')='true',false);
$$;
revoke all on function public.tn_is_community_admin() from public;
grant execute on function public.tn_is_community_admin() to authenticated;

create or replace function public.tn_validate_community_vote()
returns trigger language plpgsql security definer set search_path=public
as $$
declare opts jsonb;
begin
 select metadata->'options' into opts from public.tn_community_items where id=new.item_id and item_type='poll' and status='published';
 if opts is null or jsonb_typeof(opts)<>'array' or new.option_index>=jsonb_array_length(opts) then raise exception 'Invalid or closed poll option'; end if;
 return new;
end $$;
drop trigger if exists tn_validate_community_vote on public.tn_community_votes;
create trigger tn_validate_community_vote before insert or update on public.tn_community_votes for each row execute function public.tn_validate_community_vote();

alter table public.tn_community_items enable row level security;
alter table public.tn_community_replies enable row level security;
alter table public.tn_community_votes enable row level security;
alter table public.tn_community_reactions enable row level security;
alter table public.tn_community_reports enable row level security;

drop policy if exists "Published community items are public" on public.tn_community_items;
create policy "Published community items are public" on public.tn_community_items for select using(status='published' or auth.uid()=user_id or public.tn_is_community_admin());
drop policy if exists "Members submit community items" on public.tn_community_items;
create policy "Members submit community items" on public.tn_community_items for insert to authenticated with check(auth.uid()=user_id and status='pending');
drop policy if exists "Admins create community content" on public.tn_community_items;
create policy "Admins create community content" on public.tn_community_items for insert to authenticated with check(public.tn_is_community_admin() and auth.uid()=user_id);
drop policy if exists "Admins moderate community items" on public.tn_community_items;
create policy "Admins moderate community items" on public.tn_community_items for update to authenticated using(public.tn_is_community_admin()) with check(public.tn_is_community_admin());
drop policy if exists "Admins delete community items" on public.tn_community_items;
create policy "Admins delete community items" on public.tn_community_items for delete to authenticated using(public.tn_is_community_admin());

drop policy if exists "Published replies are visible" on public.tn_community_replies;
create policy "Published replies are visible" on public.tn_community_replies for select using(status='published' or auth.uid()=user_id or public.tn_is_community_admin());
drop policy if exists "Members reply to published forum threads" on public.tn_community_replies;
create policy "Members reply to published forum threads" on public.tn_community_replies for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Admins moderate replies" on public.tn_community_replies;
create policy "Admins moderate replies" on public.tn_community_replies for update to authenticated using(public.tn_is_community_admin()) with check(public.tn_is_community_admin());
drop policy if exists "Admins delete replies" on public.tn_community_replies;
create policy "Admins delete replies" on public.tn_community_replies for delete to authenticated using(public.tn_is_community_admin());

drop policy if exists "Members read own votes" on public.tn_community_votes;
create policy "Members read own votes" on public.tn_community_votes for select to authenticated using(auth.uid()=user_id or public.tn_is_community_admin());
drop policy if exists "Members vote once" on public.tn_community_votes;
create policy "Members vote once" on public.tn_community_votes for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Members react" on public.tn_community_reactions;
create policy "Members react" on public.tn_community_reactions for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.tn_community_items i where i.id=item_id and i.status='published'));
drop policy if exists "Members view reactions" on public.tn_community_reactions;
create policy "Members view reactions" on public.tn_community_reactions for select using(true);
drop policy if exists "Members remove own reactions" on public.tn_community_reactions;
create policy "Members remove own reactions" on public.tn_community_reactions for delete to authenticated using(auth.uid()=user_id);

drop policy if exists "Members report content" on public.tn_community_reports;
create policy "Members report content" on public.tn_community_reports for insert to authenticated with check(auth.uid()=reporter_id and exists(select 1 from public.tn_community_items i where i.id=item_id and i.status='published'));
drop policy if exists "Admins review reports" on public.tn_community_reports;
create policy "Admins review reports" on public.tn_community_reports for all to authenticated using(public.tn_is_community_admin()) with check(public.tn_is_community_admin());

create or replace view public.tn_community_poll_results as
 select item_id,option_index,count(*)::bigint as vote_count from public.tn_community_votes group by item_id,option_index;
grant select on public.tn_community_poll_results to anon,authenticated;
grant select on public.tn_community_items to anon,authenticated;
grant insert,update,delete on public.tn_community_items to authenticated;
grant select on public.tn_community_replies to anon,authenticated;
grant insert,update,delete on public.tn_community_replies to authenticated;
grant select,insert on public.tn_community_votes to authenticated;
grant select,insert,delete on public.tn_community_reactions to authenticated;
grant select,insert,update on public.tn_community_reports to authenticated;

-- Keep video private. Uploader path is peoples-mic/<auth.uid()>/<random-file>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tacoma-nights-community-private','tacoma-nights-community-private',false,157286400,array['video/webm','video/mp4','video/quicktime'])
on conflict(id) do update set public=false,file_size_limit=157286400,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Community video uploader can upload" on storage.objects;
create policy "Community video uploader can upload" on storage.objects for insert to authenticated with check(bucket_id='tacoma-nights-community-private' and (storage.foldername(name))[1]='peoples-mic' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists "Uploader or admin can read community video" on storage.objects;
create policy "Uploader or admin can read community video" on storage.objects for select to authenticated using(bucket_id='tacoma-nights-community-private' and (owner_id=auth.uid()::text or public.tn_is_community_admin()));
drop policy if exists "Admin can delete community video" on storage.objects;
create policy "Admin can delete community video" on storage.objects for delete to authenticated using(bucket_id='tacoma-nights-community-private' and public.tn_is_community_admin());
