# Security

- Frontend contains only the Supabase URL and publishable key.
- Never expose service_role or secret keys.
- Authentication uses Supabase Auth.
- Admin authorization checks server-issued app_metadata.role=admin, never user_metadata.
- RLS is authoritative; hiding UI is not a security boundary.
- Public submission writes comply with the existing INSERT policy.
- Unpublished content and private production records are not exposed.
- Add rate limiting/abuse protection before promoting forms widely.
- Uploads must use existing private storage policies and signed URLs after bucket inspection.
