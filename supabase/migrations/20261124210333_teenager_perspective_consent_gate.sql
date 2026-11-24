-- Require a recorded participant + guardian + publication consent before any viewer submission is approved.
create or replace function public.teen_perspective_guard_approval()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if not exists (
      select 1 from public.teen_perspective_consents c
      where c.submission_id = new.id
        and c.participant_consent = true
        and c.guardian_consent = true
        and c.publication_consent = true
    ) then
      raise exception 'Recorded participant, guardian, and publication consent is required before approval.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.teen_perspective_guard_approval() from public,anon,authenticated;
drop trigger if exists teen_perspective_consent_before_approval on public.teen_perspective_submissions;
create trigger teen_perspective_consent_before_approval
before update of status on public.teen_perspective_submissions
for each row execute function public.teen_perspective_guard_approval();
