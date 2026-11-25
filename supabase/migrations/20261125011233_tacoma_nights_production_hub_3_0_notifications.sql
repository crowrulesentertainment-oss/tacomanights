create or replace function private.tn_production_notify_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
 if auth.uid() is null or not private.tn_production_is_admin() then return new; end if;
 insert into public.tn_notifications(user_id,title,message,href)
 values (new.assignee_id,'New Tacoma Nights assignment',new.title||' has been assigned to you. Check your production workspace for instructions and deadlines.','https://crowrulesentertainment-oss.github.io/tacomanights/production/');
 return new;
end;
$$;
revoke all on function private.tn_production_notify_assignment() from public, anon, authenticated;
drop trigger if exists tn_production_assignment_notification on public.tn_production_assignments;
create trigger tn_production_assignment_notification after insert on public.tn_production_assignments for each row execute function private.tn_production_notify_assignment();
create or replace function private.tn_production_notify_upload_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
 if auth.uid() is null or not private.tn_production_is_admin() then return new; end if;
 if new.status is distinct from old.status and new.reviewed_by = auth.uid() then
  insert into public.tn_notifications(user_id,title,message,href)
  values (new.uploader_id,'Segment submission reviewed',new.title||' status changed to '||replace(new.status,'_',' ')||coalesce('. Producer note: '||new.producer_note,''),'https://crowrulesentertainment-oss.github.io/tacomanights/production/');
 end if;
 return new;
end;
$$;
revoke all on function private.tn_production_notify_upload_review() from public, anon, authenticated;
drop trigger if exists tn_production_upload_review_notification on public.tn_production_uploads;
create trigger tn_production_upload_review_notification after update of status on public.tn_production_uploads for each row execute function private.tn_production_notify_upload_review();