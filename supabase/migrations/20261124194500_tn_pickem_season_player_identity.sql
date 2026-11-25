drop view if exists public.tn_pickem_season_leaderboard;
create view public.tn_pickem_season_leaderboard as
select
  w.season_year,
  (array_agg(e.display_name order by e.updated_at desc))[1] as display_name,
  sum(e.points)::integer as points,
  sum(e.correct_picks)::integer as correct_picks,
  count(distinct e.week_id)::integer as weeks_played
from public.tn_pickem_entries e
join public.tn_pickem_weeks w on w.id=e.week_id
where w.status in ('locked','completed')
group by w.season_year,e.entry_token;
grant select on public.tn_pickem_season_leaderboard to anon,authenticated;
