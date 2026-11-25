alter table public.tn_production_requests drop constraint if exists tn_production_requests_assignment_check;
alter table public.tn_production_requests add constraint tn_production_requests_assignment_check check (
 (request_type = 'assignment_status' and assignment_id is not null and requested_status in ('in_progress','submitted','complete'))
 or (request_type <> 'assignment_status' and assignment_id is null and requested_status is null)
);