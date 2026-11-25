-- Tacoma Nights Production Hub 3.0 additive foundation
-- Existing production tables, membership helpers, storage, and policies remain unchanged.
create table if not exists public.tn_production_research (
 id uuid primary key default gen_random_uuid(), episode_id uuid references public.tn_production_episodes(id) on delete set null,
 title text not null, category text not null default 'general', summary text not null, source_url text, source_name text,
 assigned_to uuid references auth.users(id) on delete set null, created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
 status text not null default 'idea' check (status in ('idea','researching','ready','archived')), notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tn_research_source_url_https check (source_url is null or source_url ~* '^https://')
);
create table if not exists public.tn_production_editing (
 id uuid primary key default gen_random_uuid(), episode_id uuid not null unique references public.tn_production_episodes(id) on delete cascade,
 status text not null default 'not_started' check (status in ('not_started','ingest','rough_cut','review','revisions','final_cut','approved','scheduled')),
 editor_id uuid references auth.users(id) on delete set null,
 checklist jsonb not null default '{"media_ingested":false,"audio_checked":false,"picture_checked":false,"graphics_added":false,"captions_checked":false,"thumbnail_ready":false,"final_export":false}'::jsonb,
 notes text, review_notes text, version_label text, target_ready_at timestamptz, approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tn_production_calendar (
 id uuid primary key default gen_random_uuid(), episode_id uuid references public.tn_production_episodes(id) on delete set null,
 title text not null, description text, event_type text not null default 'production' check (event_type in ('planning','research','assignment','recording','deadline','editing','review','premiere','guest','special','production')),
 starts_at timestamptz not null, ends_at timestamptz, all_day boolean not null default false,
 created_by uuid not null references auth.users(id) on delete cascade default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tn_calendar_end_after_start check (ends_at is null or ends_at >= starts_at)
);
create table if not exists public.tn_production_guests (
 id uuid primary key default gen_random_uuid(), episode_id uuid references public.tn_production_episodes(id) on delete set null,
 guest_name text not null, email text, phone text, organization text, topic text, notes text, availability jsonb not null default '{}'::jsonb,
 status text not null default 'prospect' check (status in ('prospect','invited','confirmed','scheduled','completed','declined','cancelled')),
 interview_at timestamptz, meeting_url text, created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tn_production_training (
 id uuid primary key default gen_random_uuid(), title text not null, category text not null default 'getting_started', description text not null,
 resource_url text, content text, sort_order integer not null default 0, is_published boolean not null default false,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tn_training_url_https check (resource_url is null or resource_url ~* '^https://')
);
create table if not exists public.tn_production_feedback (
 id uuid primary key default gen_random_uuid(), episode_id uuid references public.tn_production_episodes(id) on delete set null,
 submitter_name text, submitter_email text, category text not null default 'general' check (category in ('question','topic','guest_suggestion','episode_feedback','general')),
 rating smallint check (rating between 1 and 5), message text not null,
 status text not null default 'pending' check (status in ('pending','reviewing','considered','featured','closed')),
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.tn_production_recognition (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade,
 episode_id uuid references public.tn_production_episodes(id) on delete set null, award_name text not null, reason text not null,
 awarded_by uuid not null references auth.users(id) on delete restrict, awarded_at timestamptz not null default now()
);
create index if not exists tn_research_episode_idx on public.tn_production_research(episode_id,created_at desc);
create index if not exists tn_research_assignee_idx on public.tn_production_research(assigned_to,status);
create index if not exists tn_editing_status_idx on public.tn_production_editing(status,target_ready_at);
create index if not exists tn_calendar_starts_idx on public.tn_production_calendar(starts_at);
create index if not exists tn_guests_episode_idx on public.tn_production_guests(episode_id,status);
create index if not exists tn_training_published_idx on public.tn_production_training(is_published,sort_order);
create index if not exists tn_feedback_status_idx on public.tn_production_feedback(status,created_at desc);
create index if not exists tn_recognition_recipient_idx on public.tn_production_recognition(recipient_id,awarded_at desc);
alter table public.tn_production_research enable row level security;
alter table public.tn_production_editing enable row level security;
alter table public.tn_production_calendar enable row level security;
alter table public.tn_production_guests enable row level security;
alter table public.tn_production_training enable row level security;
alter table public.tn_production_feedback enable row level security;
alter table public.tn_production_recognition enable row level security;
grant select,insert,update,delete on public.tn_production_research,public.tn_production_editing,public.tn_production_calendar,public.tn_production_guests,public.tn_production_training,public.tn_production_feedback,public.tn_production_recognition to authenticated;
grant insert on public.tn_production_feedback to anon;
create policy "tn research member read" on public.tn_production_research for select to authenticated using ((select private.tn_production_is_member()));
create policy "tn research member create own" on public.tn_production_research for insert to authenticated with check ((select private.tn_production_is_member()) and created_by=(select auth.uid()));
create policy "tn research admin update" on public.tn_production_research for update to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn research admin delete" on public.tn_production_research for delete to authenticated using ((select private.tn_production_is_admin()));
create policy "tn editing member read" on public.tn_production_editing for select to authenticated using ((select private.tn_production_is_member()));
create policy "tn editing admin manage" on public.tn_production_editing for all to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn calendar member read" on public.tn_production_calendar for select to authenticated using ((select private.tn_production_is_member()));
create policy "tn calendar admin manage" on public.tn_production_calendar for all to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn guest admin only" on public.tn_production_guests for all to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn training member published read" on public.tn_production_training for select to authenticated using ((select private.tn_production_is_member()) and is_published=true);
create policy "tn training admin manage" on public.tn_production_training for all to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn feedback public pending insert" on public.tn_production_feedback for insert to anon,authenticated with check (status='pending' and reviewed_by is null and reviewed_at is null);
create policy "tn feedback admin read" on public.tn_production_feedback for select to authenticated using ((select private.tn_production_is_admin()));
create policy "tn feedback admin update" on public.tn_production_feedback for update to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
create policy "tn recognition member read" on public.tn_production_recognition for select to authenticated using ((select private.tn_production_is_member()));
create policy "tn recognition admin manage" on public.tn_production_recognition for all to authenticated using ((select private.tn_production_is_admin())) with check ((select private.tn_production_is_admin()));
}
