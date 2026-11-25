alter table public.tacoma_nights_remote_hosts
  add column if not exists banner_count_enabled boolean not null default false;

create or replace function public.tn_public_remote_host_count()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::integer
  from public.tacoma_nights_remote_hosts
  where team_status = 'active'
    and banner_count_enabled is true;
$function$;

comment on column public.tacoma_nights_remote_hosts.banner_count_enabled
  is 'When true, this active remote host is included in the public Tacoma Nights homepage hero count.';
