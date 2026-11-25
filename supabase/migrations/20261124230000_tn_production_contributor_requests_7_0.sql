create table if not exists public.tn_production_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 request_type text not null check (request_type in ('assignment_status','availability','time_off')),
 assignment_id uuid references public.tn_production_assignments(id) on delete set null,
 requested_status text,
 starts_on date,
 ends_on date,
 details text not null check (char_length(details) between 5 and 3000),
 status text not null default 'pending' check (status in ('pending','approved','declined')),
 review_note text,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 constraint tn_production_requests_dates_check check (starts_on is null or ends_on is null or ends_on >= starts_on),
 constraint tn_production_requests_assignment_check check (
  (request_type = 'assignment_status' and assignment_id is not null and requested_status in ('in_progress','submitted','complete'))
  or (request_type <> 'assignment_status' and assignment_id is null and requested_status is null)
 )
);
create index if not exists tn_production_requests_requester_created_idx on public.tn_production_requests(requester_id,created_at desc);
create index if not exists tn_production_requests_status_created_idx on public.tn_production_requests(status,created_at desc);
alter table public.tn_production_requests enable row level security;
drop policy if exists "production requests member submit own" on public.tn_production_requests;
create policy "production requests member submit own" on public.tn_production_requests for insert to authenticated
 with check (requester_id = auth.uid() and private.tn_production_is_member() and status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "production requests own or admin read" on public.tn_production_requests;
create policy "production requests own or admin read" on public.tn_production_requests for select to authenticated
 using (requester_id = auth.uid() or private.tn_production_is_admin());
drop policy if exists "production requests admin review" on public.tn_production_requests;
create policy "production requests admin review" on public.tn_production_requests for update to authenticated
 using (private.tn_production_is_admin()) with check (private.tn_production_is_admin());
revoke all on public.tn_production_requests from anon, public;
grant select,insert,update on public.tn_production_requests to authenticated;
