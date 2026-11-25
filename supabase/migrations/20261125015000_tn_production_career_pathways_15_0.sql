create table if not exists public.tn_production_career_pathways (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 current_role_label text,
 target_role text not null,
 pathway_stage text not null default 'exploring',
 focus_areas text[] not null default '{}',
 next_milestone text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint tn_career_target_role_length check(char_length(btrim(target_role)) between 2 and 100),
 constraint tn_career_stage_check check(pathway_stage in ('exploring','building_skills','practicing','ready_for_review','advancing')),
 constraint tn_career_focus_count check(cardinality(focus_areas)<=12),
 constraint tn_career_notes_length check(notes is null or char_length(notes)<=1800),
 constraint tn_career_milestone_length check(next_milestone is null or char_length(next_milestone)<=240)
);
create table if not exists public.tn_production_mentorship_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 focus_area text not null,
 goals text not null,
 availability_note text,
 status text not null default 'requested',
 mentor_id uuid references auth.users(id) on delete set null,
 producer_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 constraint tn_mentor_focus_length check(char_length(btrim(focus_area)) between 2 and 100),
 constraint tn_mentor_goals_length check(char_length(btrim(goals)) between 5 and 1200),
 constraint tn_mentor_availability_length check(availability_note is null or char_length(availability_note)<=500),
 constraint tn_mentor_status_check check(status in ('requested','matching','matched','completed','closed')),
 constraint tn_mentor_note_length check(producer_note is null or char_length(producer_note)<=1200)
);
create index if not exists tn_mentor_requests_created_idx on public.tn_production_mentorship_requests(created_at desc);
create table if not exists public.tn_production_readiness_reviews (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 readiness_level text not null,
 recommended_role text,
 review_notes text not null,
 next_steps text,
 reviewed_at timestamptz not null default now(),
 next_review_at date,
 constraint tn_readiness_level_check check(readiness_level in ('developing','progressing','nearly_ready','ready')),
 constraint tn_readiness_role_length check(recommended_role is null or char_length(recommended_role)<=100),
 constraint tn_readiness_notes_length check(char_length(btrim(review_notes)) between 5 and 1800),
 constraint tn_readiness_next_steps_length check(next_steps is null or char_length(next_steps)<=1200)
);
create index if not exists tn_readiness_user_date_idx on public.tn_production_readiness_reviews(user_id,reviewed_at desc);
alter table public.tn_production_career_pathways enable row level security;
alter table public.tn_production_mentorship_requests enable row level security;
alter table public.tn_production_readiness_reviews enable row level security;
drop policy if exists "tn career pathway read own or admin" on public.tn_production_career_pathways;
create policy "tn career pathway read own or admin" on public.tn_production_career_pathways for select to authenticated using(user_id=auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn career pathway insert own member" on public.tn_production_career_pathways;
create policy "tn career pathway insert own member" on public.tn_production_career_pathways for insert to authenticated with check(user_id=auth.uid() and (select private.tn_production_is_member()));
drop policy if exists "tn career pathway update own or admin" on public.tn_production_career_pathways;
create policy "tn career pathway update own or admin" on public.tn_production_career_pathways for update to authenticated using(user_id=auth.uid() or (select private.tn_production_is_admin())) with check(user_id=auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn career pathway delete own or admin" on public.tn_production_career_pathways;
create policy "tn career pathway delete own or admin" on public.tn_production_career_pathways for delete to authenticated using(user_id=auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn mentorship read own or admin" on public.tn_production_mentorship_requests;
create policy "tn mentorship read own or admin" on public.tn_production_mentorship_requests for select to authenticated using(requester_id=auth.uid() or mentor_id=auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn mentorship request own member" on public.tn_production_mentorship_requests;
create policy "tn mentorship request own member" on public.tn_production_mentorship_requests for insert to authenticated with check(requester_id=auth.uid() and (select private.tn_production_is_member()));
drop policy if exists "tn mentorship admin update" on public.tn_production_mentorship_requests;
create policy "tn mentorship admin update" on public.tn_production_mentorship_requests for update to authenticated using((select private.tn_production_is_admin())) with check((select private.tn_production_is_admin()));
drop policy if exists "tn readiness read own or admin" on public.tn_production_readiness_reviews;
create policy "tn readiness read own or admin" on public.tn_production_readiness_reviews for select to authenticated using(user_id=auth.uid() or (select private.tn_production_is_admin()));
drop policy if exists "tn readiness admin insert" on public.tn_production_readiness_reviews;
create policy "tn readiness admin insert" on public.tn_production_readiness_reviews for insert to authenticated with check((select private.tn_production_is_admin()) and reviewer_id=auth.uid());
drop policy if exists "tn readiness admin update" on public.tn_production_readiness_reviews;
create policy "tn readiness admin update" on public.tn_production_readiness_reviews for update to authenticated using((select private.tn_production_is_admin())) with check((select private.tn_production_is_admin()));
drop policy if exists "tn readiness admin delete" on public.tn_production_readiness_reviews;
create policy "tn readiness admin delete" on public.tn_production_readiness_reviews for delete to authenticated using((select private.tn_production_is_admin()));
comment on table public.tn_production_career_pathways is 'Contributor-owned career pathway goals and desired production roles.';
comment on table public.tn_production_mentorship_requests is 'Private mentorship requests; production leadership manages matching.';
comment on table public.tn_production_readiness_reviews is 'Producer-authored role readiness reviews; visible to the contributor and production leadership.';