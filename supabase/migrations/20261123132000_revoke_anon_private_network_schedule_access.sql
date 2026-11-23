-- Remove the anonymous role's default grants from producer-only network tables.
-- Their existing RLS policies remain owner-scoped to authenticated users.
revoke all privileges on table public.live_network_schedule, public.live_network_programs from anon;
revoke all privileges (id, owner_id, program_id, starts_at, ends_at, host_name, host_user_id, status, handoff_mode, notes, created_at, updated_at, is_public) on table public.live_network_schedule from anon;
revoke all privileges (id, owner_id, title, slug, description, category, format, default_duration_minutes, is_active, created_at, updated_at) on table public.live_network_programs from anon;