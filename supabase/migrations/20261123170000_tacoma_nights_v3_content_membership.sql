-- Tacoma Nights 3.0 additive content, free membership and moderated submissions.
-- Existing Network Studio / OBS / Streamlabs tables are intentionally untouched.
-- Review and apply separately after confirming the live Supabase schema.
create table if not exists public.tn_memberships(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '',role text not null default 'member' check(role in('member','contributor','host','producer','editor','moderator','administrator')),status text not null default 'active' check(status in('active','suspended')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.tn_content(id uuid primary key default gen_random_uuid(),content_type text not null check(content_type in('episode','article','event','original','spotlight','perspective','announcement')),slug text not null unique,title text not null,excerpt text not null default '',body text not null default '',image_url text,video_url text,metadata jsonb not null default '{}'::jsonb,status text not null default 'draft' check(status in('draft','pending','published','archived')),created_by uuid references auth.users(id) on delete set null,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.tn_submissions(id uuid primary key default gen_random_uuid(),submission_type text not null check(submission_type in('voicewall','spotlight','community-submit','guest','apply','events-submit','news-tip','general')),submitter_name text not null default '',submitter_email text not null default '',title text not null default '',message text not null,metadata jsonb not null default '{}'::jsonb,status text not null default 'pending' check(status in('pending','in_review','approved','rejected','published')),reviewed_by uuid references auth.users(id) on delete set null,reviewed_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.tn_saved_content(user_id uuid not null references auth.users(id) on delete cascade,content_id uuid not null references public.tn_content(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,content_id));
create table if not exists public.tn_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null,message text not null default '',href text,read_at timestamptz,created_at timestamptz not null default now());
create index if not exists tn_content_feed_idx on public.tn_content(content_type,status,published_at desc);
create index if not exists tn_submissions_review_idx on public.tn_submissions(status,created_at desc);
create index if not exists tn_notifications_user_idx on public.tn_notifications(user_id,created_at desc);
alter table public.tn_memberships enable row level security;alter table public.tn_content enable row level security;alter table public.tn_submissions enable row level security;alter table public.tn_saved_content enable row level security;alter table public.tn_notifications enable row level security;
create or replace function public.tn_is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.tn_memberships m where m.user_id=auth.uid() and m.status='active' and m.role in('producer','editor','moderator','administrator')); $$;
revoke all on function public.tn_is_staff() from public;grant execute on function public.tn_is_staff() to authenticated;
drop policy if exists "tn membership read own" on public.tn_memberships;create policy "tn membership read own" on public.tn_memberships for select to authenticated using(user_id=auth.uid());
drop policy if exists "tn membership staff read" on public.tn_memberships;create policy "tn membership staff read" on public.tn_memberships for select to authenticated using(public.tn_is_staff());
drop policy if exists "tn content published read" on public.tn_content;create policy "tn content published read" on public.tn_content for select to anon,authenticated using(status='published');
drop policy if exists "tn content staff manage" on public.tn_content;create policy "tn content staff manage" on public.tn_content for all to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
drop policy if exists "tn submissions public insert" on public.tn_submissions;create policy "tn submissions public insert" on public.tn_submissions for insert to anon,authenticated with check(status='pending');
drop policy if exists "tn submissions staff read" on public.tn_submissions;create policy "tn submissions staff read" on public.tn_submissions for select to authenticated using(public.tn_is_staff());
drop policy if exists "tn submissions staff update" on public.tn_submissions;create policy "tn submissions staff update" on public.tn_submissions for update to authenticated using(public.tn_is_staff()) with check(public.tn_is_staff());
drop policy if exists "tn saved content own" on public.tn_saved_content;create policy "tn saved content own" on public.tn_saved_content for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "tn notifications own" on public.tn_notifications;create policy "tn notifications own" on public.tn_notifications for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.tn_content to anon,authenticated;grant insert on public.tn_submissions to anon,authenticated;grant select,insert,delete on public.tn_saved_content to authenticated;grant select,update on public.tn_notifications to authenticated;grant select on public.tn_memberships to authenticated;grant select,insert,update,delete on public.tn_content to authenticated;grant select,update on public.tn_submissions to authenticated;
-- Membership roles cannot be self-assigned through the browser.

-- Automatically provision a basic free member row after email signup.
-- Role is fixed to member; public signup cannot grant elevated permissions.
create or replace function public.tn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tn_memberships(user_id, display_name, role, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''), 'member', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.tn_handle_new_user() from public;
drop trigger if exists tn_auth_user_created on auth.users;
create trigger tn_auth_user_created
after insert on auth.users
for each row execute function public.tn_handle_new_user();
