-- Tacoma Nights Production Hub — Supabase setup
-- Run this entire file in Supabase SQL Editor for project cevylpnoexugwgygvtgu.
-- Uses a private Storage bucket. No service-role key is used in the browser.

create extension if not exists pgcrypto;

create table if not exists public.tn_production_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text,
 display_name text,
 role text not null default 'pending' check (role in ('pending','contributor','producer','admin')),
 created_at timestamptz not null default now()
);

create table if not exists public.tn_production_episodes (
 id uuid primary key default gen_random_uuid(),
 episode_number text not null,
 title text not null,
 topic text,
 premiere_at timestamptz,
 status text not null default 'idea' check (status in ('idea','planning','assigned','recording','editing','review','scheduled','published','archived')),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.tn_production_assignments (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null references public.tn_production_episodes(id) on delete cascade,
 assignee_id uuid not null references public.tn_production_profiles(id) on delete cascade,
 assigned_by uuid references auth.users(id),
 title text not null,
 instructions text,
 due_at timestamptz,
 status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','complete','cancelled')),
 created_at timestamptz not null default now()
);

create table if not exists public.tn_production_uploads (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null references public.tn_production_episodes(id) on delete cascade,
 uploader_id uuid not null references public.tn_production_profiles(id),
 title text not null,
 notes text,
 storage_path text not null,
 original_filename text,
 mime_type text,
 file_size bigint,
 status text not null default 'submitted' check (status in ('submitted','approved','revision','rejected')),
 producer_note text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists public.tn_production_ideas (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 category text,
 format text,
 description text not null,
 submitter_id uuid references auth.users(id),
 submitter_name text,
 status text not null default 'new' check (status in ('new','discussing','selected','declined','converted')),
 created_at timestamptz not null default now()
);

create table if not exists public.tn_production_updates (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 category text,
 body text not null,
 visibility text not null default 'public' check (visibility in ('public','team')),
 author_id uuid references auth.users(id),
 published_at timestamptz not null default now()
);

create table if not exists public.tn_production_activity (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id),
 action text not null,
 detail text,
 created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- These narrowly scoped SECURITY DEFINER helpers live outside the exposed API schema.
create or replace function private.tn_production_is_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp
as $function$ select auth.uid() is not null and exists(select 1 from public.tn_production_profiles p where p.id=auth.uid() and p.role in ('admin','producer') ); $function$;

create or replace function private.tn_production_is_member()
returns boolean language sql stable security definer set search_path=public,pg_temp
as $function$ select auth.uid() is not null and exists(select 1 from public.tn_production_profiles p where p.id=auth.uid() and p.role in ('contributor','producer','admin') ); $function$;

create or replace function private.tn_production_new_profile()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $function$ begin
 insert into public.tn_production_profiles(id,email,display_name,role)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),'pending')
 on conflict(id) do update set email=excluded.email;
 return new;
end; $function$;

revoke all on function private.tn_production_is_admin() from public, anon;
revoke all on function private.tn_production_is_member() from public, anon;
revoke all on function private.tn_production_new_profile() from public, anon, authenticated;
grant execute on function private.tn_production_is_admin() to authenticated;
grant execute on function private.tn_production_is_member() to authenticated;

drop trigger if exists tn_production_auth_profile on auth.users;
create trigger tn_production_auth_profile after insert on auth.users for each row execute function private.tn_production_new_profile();

alter table public.tn_production_profiles enable row level security;
alter table public.tn_production_episodes enable row level security;
alter table public.tn_production_assignments enable row level security;
alter table public.tn_production_uploads enable row level security;
alter table public.tn_production_ideas enable row level security;
alter table public.tn_production_updates enable row level security;
alter table public.tn_production_activity enable row level security;

drop policy if exists "production profile read" on public.tn_production_profiles;
create policy "production profile read" on public.tn_production_profiles for select to authenticated using (id=auth.uid() or private.tn_production_is_admin());
drop policy if exists "production profile admin update" on public.tn_production_profiles;
create policy "production profile admin update" on public.tn_production_profiles for update to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());

drop policy if exists "production episodes member read" on public.tn_production_episodes;
create policy "production episodes member read" on public.tn_production_episodes for select to authenticated using (private.tn_production_is_member());
drop policy if exists "production episodes admin write" on public.tn_production_episodes;
create policy "production episodes admin write" on public.tn_production_episodes for all to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());

drop policy if exists "production assignments member read" on public.tn_production_assignments;
create policy "production assignments member read" on public.tn_production_assignments for select to authenticated using (assignee_id=auth.uid() or private.tn_production_is_admin());
drop policy if exists "production assignments admin write" on public.tn_production_assignments;
create policy "production assignments admin write" on public.tn_production_assignments for all to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());
drop policy if exists "production assignment assignee update" on public.tn_production_assignments;
create policy "production assignment assignee update" on public.tn_production_assignments for update to authenticated using (assignee_id=auth.uid()) with check (assignee_id=auth.uid());

drop policy if exists "production uploads read" on public.tn_production_uploads;
create policy "production uploads read" on public.tn_production_uploads for select to authenticated using (uploader_id=auth.uid() or private.tn_production_is_admin());
drop policy if exists "production uploads submit" on public.tn_production_uploads;
create policy "production uploads submit" on public.tn_production_uploads for insert to authenticated with check (uploader_id=auth.uid() and private.tn_production_is_member());
drop policy if exists "production uploads admin review" on public.tn_production_uploads;
create policy "production uploads admin review" on public.tn_production_uploads for update to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());

drop policy if exists "production ideas member read" on public.tn_production_ideas;
create policy "production ideas member read" on public.tn_production_ideas for select to authenticated using (private.tn_production_is_member());
drop policy if exists "production ideas member submit" on public.tn_production_ideas;
create policy "production ideas member submit" on public.tn_production_ideas for insert to authenticated with check (submitter_id=auth.uid() and private.tn_production_is_member());
drop policy if exists "production ideas admin manage" on public.tn_production_ideas;
create policy "production ideas admin manage" on public.tn_production_ideas for all to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());

drop policy if exists "production updates public read" on public.tn_production_updates;
create policy "production updates public read" on public.tn_production_updates for select to anon,authenticated using (visibility='public' or (visibility='team' and private.tn_production_is_member()));
drop policy if exists "production updates admin write" on public.tn_production_updates;
create policy "production updates admin write" on public.tn_production_updates for all to authenticated using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());

drop policy if exists "production activity admin read" on public.tn_production_activity;
create policy "production activity admin read" on public.tn_production_activity for select to authenticated using (private.tn_production_is_admin());
drop policy if exists "production activity member insert" on public.tn_production_activity;
create policy "production activity member insert" on public.tn_production_activity for insert to authenticated with check (actor_id=auth.uid() and private.tn_production_is_member());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tn-production-private','tn-production-private',false,52428800,array['video/*','audio/*','image/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict(id) do update set public=false,file_size_limit=52428800;

drop policy if exists "production storage upload own" on storage.objects;
create policy "production storage upload own" on storage.objects for insert to authenticated with check (bucket_id='tn-production-private' and (storage.foldername(name))[1]=auth.uid()::text and private.tn_production_is_member());
drop policy if exists "production storage read own or admin" on storage.objects;
create policy "production storage read own or admin" on storage.objects for select to authenticated using (bucket_id='tn-production-private' and ((storage.foldername(name))[1]=auth.uid()::text or private.tn_production_is_admin()));
drop policy if exists "production storage admin delete" on storage.objects;
create policy "production storage admin delete" on storage.objects for delete to authenticated using (bucket_id='tn-production-private' and private.tn_production_is_admin());

-- Explicit Data API privileges; RLS above remains the row-level security boundary.
grant select, insert, update, delete on public.tn_production_profiles to authenticated;
grant select, insert, update, delete on public.tn_production_episodes to authenticated;
grant select, insert, update, delete on public.tn_production_assignments to authenticated;
grant select, insert, update, delete on public.tn_production_uploads to authenticated;
grant select, insert, update, delete on public.tn_production_ideas to authenticated;
grant select, insert, update, delete on public.tn_production_updates to authenticated;
grant select, insert, update, delete on public.tn_production_activity to authenticated;
grant select on public.tn_production_updates to anon;

-- BOOTSTRAP THE EXECUTIVE PRODUCER:
-- 1. Create/sign in to your team account once through /production/.
-- 2. Replace the email below with the exact email used for that Supabase Auth account.
-- 3. Run this statement separately after the profile has been created:
-- update public.tn_production_profiles set role='admin', display_name='Executive Producer' where email='YOUR_AUTH_EMAIL_HERE';

-- Optional initial public update (safe to run once):
insert into public.tn_production_updates(title,category,body,visibility)
select 'The Tacoma Nights Production Hub is taking shape','Production announcement',
'We are building a more organized production system for episode planning, contributor assignments, segment submissions and team coordination. Follow this page for public updates as the next chapter takes shape.',
'public'
where not exists(select 1 from public.tn_production_updates where title='The Tacoma Nights Production Hub is taking shape');
