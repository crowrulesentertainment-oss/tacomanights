alter table public.tn_production_requests
 add column if not exists availability_slots jsonb;
alter table public.tn_production_requests drop constraint if exists tn_production_requests_availability_slots_check;
alter table public.tn_production_requests add constraint tn_production_requests_availability_slots_check
 check (availability_slots is null or jsonb_typeof(availability_slots)='array');

create or replace function public.tn_production_review_request(p_request_id uuid,p_decision text,p_note text default null)
returns setof public.tn_production_requests language plpgsql security definer
set search_path=public,private,pg_temp
as $function$
declare
 v_req public.tn_production_requests%rowtype;
 v_updated integer;
 v_host_id uuid;
 v_slot jsonb;
 v_weekday integer;
 v_start time;
 v_end time;
 v_timezone text;
begin
 if auth.uid() is null or not private.tn_production_is_admin() then raise exception 'Producer or administrator access required'; end if;
 if p_decision not in ('approved','declined') then raise exception 'Invalid request decision'; end if;
 select * into v_req from public.tn_production_requests where id=p_request_id for update;
 if not found or v_req.status<>'pending' then raise exception 'Request not found or already reviewed'; end if;
 if p_decision='approved' and v_req.request_type='assignment_status' then
  update public.tn_production_assignments set status=v_req.requested_status where id=v_req.assignment_id and assignee_id=v_req.requester_id;
  get diagnostics v_updated=row_count;
  if v_updated<>1 then raise exception 'The related assignment is no longer assigned to this contributor'; end if;
 end if;
 if p_decision='approved' and v_req.request_type='availability' then
  if v_req.availability_slots is null or jsonb_typeof(v_req.availability_slots)<>'array'
   or jsonb_array_length(v_req.availability_slots)<1 or jsonb_array_length(v_req.availability_slots)>14 then
   raise exception 'Availability request must contain between 1 and 14 weekly time slots';
  end if;
  select id into v_host_id from public.tacoma_nights_remote_hosts
   where user_id=v_req.requester_id and team_status='active' order by joined_at desc limit 1 for update;
  if v_host_id is null then raise exception 'No active remote-host profile is linked to this account. Ask a producer to link your host profile before approving availability.'; end if;
  delete from public.tacoma_nights_host_availability where host_id=v_host_id;
  for v_slot in select value from jsonb_array_elements(v_req.availability_slots) loop
   if jsonb_typeof(v_slot)<>'object' or coalesce(v_slot->>'weekday','') !~ '^[0-6]$'
    or coalesce(v_slot->>'start_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
    or coalesce(v_slot->>'end_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    raise exception 'Each availability slot needs a weekday and valid start/end times';
   end if;
   v_weekday:=(v_slot->>'weekday')::integer;
   v_start:=(v_slot->>'start_time')::time;
   v_end:=(v_slot->>'end_time')::time;
   v_timezone:=coalesce(nullif(v_slot->>'timezone',''),'America/Los_Angeles');
   if v_end<=v_start then raise exception 'Availability end time must be later than start time'; end if;
   if not exists(select 1 from pg_timezone_names where name=v_timezone) then raise exception 'Invalid time zone in availability request'; end if;
   if exists(select 1 from public.tacoma_nights_host_availability a where a.host_id=v_host_id and a.weekday=v_weekday and a.start_time<v_end and a.end_time>v_start) then
    raise exception 'Availability slots for the same day cannot overlap';
   end if;
   insert into public.tacoma_nights_host_availability(host_id,weekday,start_time,end_time,timezone,notes)
   values(v_host_id,v_weekday,v_start,v_end,v_timezone,'Approved contributor availability request');
  end loop;
 end if;
 update public.tn_production_requests set status=p_decision,review_note=nullif(left(coalesce(p_note,''),1500),''),reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_request_id returning * into v_req;
 return next v_req;
end;
$function$;
revoke all on function public.tn_production_review_request(uuid,text,text) from public,anon;
grant execute on function public.tn_production_review_request(uuid,text,text) to authenticated;