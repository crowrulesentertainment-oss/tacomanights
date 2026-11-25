create or replace function public.tn_production_review_request(
 p_request_id uuid,
 p_decision text,
 p_note text default null
) returns setof public.tn_production_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
 v_req public.tn_production_requests%rowtype;
 v_updated integer;
begin
 if auth.uid() is null or not private.tn_production_is_admin() then
  raise exception 'Producer or administrator access required';
 end if;
 if p_decision not in ('approved','declined') then raise exception 'Invalid request decision'; end if;
 select * into v_req from public.tn_production_requests where id=p_request_id for update;
 if not found or v_req.status <> 'pending' then raise exception 'Request not found or already reviewed'; end if;
 if p_decision='approved' and v_req.request_type='assignment_status' then
  update public.tn_production_assignments set status=v_req.requested_status
   where id=v_req.assignment_id and assignee_id=v_req.requester_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'The related assignment is no longer assigned to this contributor'; end if;
 end if;
 update public.tn_production_requests set status=p_decision,
  review_note=nullif(left(coalesce(p_note,''),1500),''),reviewed_by=auth.uid(),reviewed_at=now()
  where id=p_request_id returning * into v_req;
 return next v_req;
end;
$$;
revoke all on function public.tn_production_review_request(uuid,text,text) from public, anon;
grant execute on function public.tn_production_review_request(uuid,text,text) to authenticated;
