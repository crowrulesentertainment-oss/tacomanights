-- Teenager Perspective 2.0 — isolate anonymous uploads in a capped private bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('teenager-perspective-inbox','teenager-perspective-inbox',false,104857600,
array['audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/x-m4a','audio/aac','video/mp4','video/webm','video/quicktime'])
on conflict(id) do nothing;
drop policy if exists "Teen perspective public private-inbox upload" on storage.objects;
create policy "Teen perspective public private-inbox upload" on storage.objects
for insert to anon,authenticated with check(bucket_id='teenager-perspective-inbox' and (storage.foldername(name))[1]='teenager-inbox');
drop policy if exists "Teen perspective staff private-inbox read" on storage.objects;
create policy "Teen perspective staff private-inbox read" on storage.objects
for select to authenticated using(bucket_id='teenager-perspective-inbox' and (storage.foldername(name))[1]='teenager-inbox' and public.tn_is_staff());
alter table public.teen_perspective_submissions drop constraint if exists teen_perspective_submissions_media_bucket_check;
alter table public.teen_perspective_submissions add constraint teen_perspective_submissions_media_bucket_check
check(media_bucket is null or media_bucket in ('teenager-perspective-inbox','teenager-perspective-media'));
drop policy if exists "Teen perspective public pending insert" on public.teen_perspective_submissions;
create policy "Teen perspective public pending insert" on public.teen_perspective_submissions
for insert to anon,authenticated with check(status='pending' and reviewed_by is null and reviewed_at is null and
(media_bucket is null or media_bucket='teenager-perspective-inbox') and (media_path is null or media_path like 'teenager-inbox/%'));
