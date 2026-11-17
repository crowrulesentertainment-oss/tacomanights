-- Tacoma Nights Production & Contributor Management 2.0 — Phase 1
-- Additive migration: preserves existing episode, crew, clip-upload and RLS structures.
alter table public.tacoma_nights_crew
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists tacoma_nights_crew_user_id_uidx
  on public.tacoma_nights_crew(user_id) where user_id is not null;
drop policy if exists "Crew members can read own linked profile" on public.tacoma_nights_crew;
create policy "Crew members can read own linked profile"
on public.tacoma_nights_crew for select to authenticated using (user_id=auth.uid());

create table if not exists public.tacoma_nights_contributor_assignments (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.tacoma_nights_crew(id) on delete cascade,
 episode_id uuid references public.tacoma_nights_production_episodes(id) on delete set null,
 segment_slug text not null, segment_title text not null, assignment_title text not null,
 brief text not null default '', due_at timestamptz,
 status text not null default 'assigned' check(status in ('assigned','in_progress','submitted','revision_requested','approved','cancelled')),
 assigned_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists tn_contributor_assignments_crew_due_idx on public.tacoma_nights_contributor_assignments(crew_id,due_at);
create index if not exists tn_contributor_assignments_episode_idx on public.tacoma_nights_contributor_assignments(episode_id);

create table if not exists public.tacoma_nights_contributor_submissions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.tacoma_nights_contributor_assignments(id) on delete cascade,
 crew_id uuid not null references public.tacoma_nights_crew(id) on delete cascade,
 submitted_by uuid not null references auth.users(id),
 storage_path text not null unique, original_filename text not null, mime_type text not null,
 file_size bigint not null check(file_size>0 and file_size<=1073741824),
 contributor_notes text not null default '',
 status text not null default 'pending' check(status in ('pending','in_review','revision_requested','approved','rejected')),
 producer_notes text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tn_contributor_submissions_video_mime check(mime_type in ('video/mp4','video/webm','video/quicktime'))
);
create index if not exists tn_contributor_submissions_status_idx on public.tacoma_nights_contributor_submissions(status,created_at desc);
create index if not exists tn_contributor_submissions_assignment_idx on public.tacoma_nights_contributor_submissions(assignment_id,created_at desc);

alter table public.tacoma_nights_contributor_assignments enable row level security;
alter table public.tacoma_nights_contributor_submissions enable row level security;
create policy "TN admins manage contributor assignments" on public.tacoma_nights_contributor_assignments for all to authenticated
using((auth.jwt()->'app_metadata'->>'role')='admin') with check((auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Contributors read own assignments" on public.tacoma_nights_contributor_assignments for select to authenticated
using(exists(select 1 from public.tacoma_nights_crew c where c.id=crew_id and c.user_id=auth.uid()));
create policy "TN admins manage contributor submissions" on public.tacoma_nights_contributor_submissions for all to authenticated
using((auth.jwt()->'app_metadata'->>'role')='admin') with check((auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Contributors read own submissions" on public.tacoma_nights_contributor_submissions for select to authenticated
using(submitted_by=auth.uid() or exists(select 1 from public.tacoma_nights_crew c where c.id=crew_id and c.user_id=auth.uid()));
create policy "Contributors submit assigned footage" on public.tacoma_nights_contributor_submissions for insert to authenticated
with check(submitted_by=auth.uid() and exists(
 select 1 from public.tacoma_nights_contributor_assignments a
 join public.tacoma_nights_crew c on c.id=a.crew_id
 where a.id=assignment_id and a.crew_id=tacoma_nights_contributor_submissions.crew_id
 and c.user_id=auth.uid() and a.status in ('assigned','in_progress','revision_requested')
) and storage_path like auth.uid()::text||'/%');

create or replace function public.tn_sync_contributor_assignment_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  update public.tacoma_nights_contributor_assignments set status='submitted',updated_at=now()
  where id=new.assignment_id and status in ('assigned','in_progress','revision_requested');
  return new;
 end if;
 if new.status='revision_requested' then
  update public.tacoma_nights_contributor_assignments set status='revision_requested',updated_at=now() where id=new.assignment_id;
 elsif new.status='approved' then
  update public.tacoma_nights_contributor_assignments set status='approved',updated_at=now() where id=new.assignment_id;
 end if;
 return new;
end $$;
create trigger tn_contributor_submission_sync after insert or update of status
on public.tacoma_nights_contributor_submissions for each row execute function public.tn_sync_contributor_assignment_status();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tacoma-nights-submissions','tacoma-nights-submissions',false,1073741824,array['video/mp4','video/webm','video/quicktime'])
on conflict(id) do nothing;
create policy "TN contributors upload own assigned footage" on storage.objects for insert to authenticated
with check(bucket_id='tacoma-nights-submissions' and (storage.foldername(name))[1]=auth.uid()::text and exists(
 select 1 from public.tacoma_nights_contributor_assignments a
 join public.tacoma_nights_crew c on c.id=a.crew_id
 where c.user_id=auth.uid() and a.id::text=(storage.foldername(name))[2]
 and a.status in ('assigned','in_progress','revision_requested')
));
create policy "TN contributors read own submitted footage" on storage.objects for select to authenticated
using(bucket_id='tacoma-nights-submissions' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "TN admins manage submission footage" on storage.objects for all to authenticated
using(bucket_id='tacoma-nights-submissions' and (auth.jwt()->'app_metadata'->>'role')='admin')
with check(bucket_id='tacoma-nights-submissions' and (auth.jwt()->'app_metadata'->>'role')='admin');
