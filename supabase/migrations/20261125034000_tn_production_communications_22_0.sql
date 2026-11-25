create table if not exists public.tn_production_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 episode_id uuid references public.tn_production_episodes(id) on delete set null,
 notification_type text not null default 'announcement' check(notification_type in ('announcement','deadline','assignment','session','review','system')),
 title text not null check(char_length(title) between 1 and 180),
 message text not null check(char_length(message) between 1 and 4000),
 href text check(href is null or (href ~ '^/' and href !~ '^//')),
 read_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists tn_production_notifications_inbox_idx on public.tn_production_notifications(recipient_id,created_at desc);
create index if not exists tn_production_notifications_unread_idx on public.tn_production_notifications(recipient_id) where read_at is null;
alter table public.tn_production_notifications enable row level security;
drop policy if exists "tn production notifications own read" on public.tn_production_notifications;
create policy "tn production notifications own read" on public.tn_production_notifications for select to authenticated using(recipient_id=auth.uid() and private.tn_production_is_member());
drop policy if exists "tn production notifications admin insert" on public.tn_production_notifications;
create policy "tn production notifications admin insert" on public.tn_production_notifications for insert to authenticated with check(private.tn_production_is_admin() and created_by=auth.uid());
drop policy if exists "tn production notifications own read update" on public.tn_production_notifications;
create policy "tn production notifications own read update" on public.tn_production_notifications for update to authenticated using(recipient_id=auth.uid() and private.tn_production_is_member()) with check(recipient_id=auth.uid() and private.tn_production_is_member());
drop policy if exists "tn production notifications admin delete" on public.tn_production_notifications;
create policy "tn production notifications admin delete" on public.tn_production_notifications for delete to authenticated using(private.tn_production_is_admin());
comment on table public.tn_production_notifications is 'Private per-member Tacoma Nights production announcements, reminders, assignment and session notifications.';