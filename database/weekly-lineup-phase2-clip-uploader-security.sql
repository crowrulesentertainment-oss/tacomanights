-- Tacoma Nights Weekly Lineup Phase 2
-- Narrow repair to the existing clip-uploader allowlist and private Storage upload policies.
-- Applied to Supabase project cevylpnoexugwgygvtgu.
-- Existing uploader table remains inaccessible through the public Data API.

create or replace function private.tn_is_approved_clip_uploader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and (
      coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
      or (
        nullif(lower(coalesce((select auth.jwt() ->> 'email'), '')), '') is not null
        and exists (
          select 1
          from public.tacoma_nights_clip_uploaders as uploader
          where lower(uploader.email) = lower((select auth.jwt() ->> 'email'))
            and uploader.enabled is true
        )
      )
    );
$function$;

revoke all on function private.tn_is_approved_clip_uploader() from public;
revoke all on function private.tn_is_approved_clip_uploader() from anon;
grant execute on function private.tn_is_approved_clip_uploader() to authenticated;

drop policy if exists "Approved cohosts submit clips" on public.tacoma_nights_clip_uploads;
create policy "Approved cohosts submit clips"
on public.tacoma_nights_clip_uploads
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and lower(co_host_email) = lower((select auth.jwt() ->> 'email'))
  and rights_confirmed is true
  and (select private.tn_is_approved_clip_uploader())
);

drop policy if exists "Approved cohosts upload private clips" on storage.objects;
create policy "Approved cohosts upload private clips"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tacoma-nights-clips'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.tn_is_approved_clip_uploader())
);
