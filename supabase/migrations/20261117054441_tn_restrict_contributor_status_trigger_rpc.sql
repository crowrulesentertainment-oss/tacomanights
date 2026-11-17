-- Prevent direct PostgREST/RPC invocation of the internal contributor submission trigger.
-- The trigger remains attached to tacoma_nights_contributor_submissions and PostgreSQL
-- does not require the invoking client role to have EXECUTE on the trigger function.
-- Keep service_role access for controlled backend maintenance only.
REVOKE EXECUTE ON FUNCTION public.tn_sync_contributor_assignment_status()
  FROM PUBLIC, anon, authenticated;
