alter table public.tn_production_profiles
  add column if not exists skills text[] not null default '{}'::text[],
  add column if not exists segment_interests text[] not null default '{}'::text[];

comment on column public.tn_production_profiles.skills is
  'Producer-managed capability tags used for advisory production assignment matching.';
comment on column public.tn_production_profiles.segment_interests is
  'Producer-managed segment and topic interests used for advisory production assignment matching.';

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.tn_production_profiles'::regclass and conname='tn_production_profiles_skills_size_check') then
    alter table public.tn_production_profiles add constraint tn_production_profiles_skills_size_check check (cardinality(skills) <= 30);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.tn_production_profiles'::regclass and conname='tn_production_profiles_segment_interests_size_check') then
    alter table public.tn_production_profiles add constraint tn_production_profiles_segment_interests_size_check check (cardinality(segment_interests) <= 30);
  end if;
end $$;