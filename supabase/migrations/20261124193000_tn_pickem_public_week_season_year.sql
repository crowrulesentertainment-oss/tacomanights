create or replace view public.tn_pickem_public_weeks as
select id,slug,title,description,lock_at,games,status,season_year
from public.tn_pickem_weeks
where status = any (array['open'::text,'locked'::text,'completed'::text]);
grant select on public.tn_pickem_public_weeks to anon, authenticated;
