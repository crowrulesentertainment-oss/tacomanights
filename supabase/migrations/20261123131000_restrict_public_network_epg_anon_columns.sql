-- Remove project-wide default privileges from anonymous access on the EPG projection.
revoke all privileges on table public.live_network_public_schedule from anon, public;
revoke all privileges (id, owner_id, source_schedule_id, program_title, program_description, category, format, host_name, starts_at, ends_at, status, is_published, updated_at) on table public.live_network_public_schedule from anon, public;
grant select (program_title, program_description, category, format, host_name, starts_at, ends_at, status, updated_at) on table public.live_network_public_schedule to anon;