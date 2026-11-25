alter table public.tacoma_nights_remote_hosts
  alter column email drop not null,
  add column if not exists crew_profile_id uuid references public.tacoma_nights_crew(id) on delete set null;

create unique index if not exists tacoma_nights_remote_hosts_crew_profile_uidx
  on public.tacoma_nights_remote_hosts (crew_profile_id)
  where crew_profile_id is not null;

comment on column public.tacoma_nights_remote_hosts.crew_profile_id
  is 'Links a remote host roster entry to its source Tacoma Nights crew profile when promoted from the Crew directory.';
