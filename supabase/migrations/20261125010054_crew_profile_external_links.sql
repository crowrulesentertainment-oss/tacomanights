-- Add approved public website, portfolio and social destinations to existing Tacoma Nights crew profiles.
-- Additive only: preserves existing profile_url, links_approved, RLS policies and current profile data.
alter table public.tacoma_nights_crew
  add column if not exists website_url text,
  add column if not exists portfolio_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

comment on column public.tacoma_nights_crew.website_url is 'Crew member personal website; displayed only when links_approved is true.';
comment on column public.tacoma_nights_crew.portfolio_url is 'Crew member portfolio or work samples; displayed only when links_approved is true.';
comment on column public.tacoma_nights_crew.social_links is 'JSON object of social destinations; displayed only when links_approved is true.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tacoma_nights_crew'::regclass
      and conname = 'tacoma_nights_crew_social_links_object'
  ) then
    alter table public.tacoma_nights_crew
      add constraint tacoma_nights_crew_social_links_object
      check (jsonb_typeof(social_links) = 'object');
  end if;
end $$;
