alter table public.tn_pickem_weeks
  add column if not exists season_year integer not null default extract(year from now())::integer,
  add column if not exists week_number integer,
  add column if not exists provider text not null default 'manual',
  add column if not exists auto_generated boolean not null default false,
  add column if not exists generated_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.tn_pickem_entries
  add column if not exists correct_picks integer not null default 0,
  add column if not exists scored_at timestamptz;

create table if not exists public.tn_pickem_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'apisports',
  provider_sport text not null,
  provider_game_id text not null,
  sport text not null,
  league text not null default '',
  league_id text,
  home_team text not null,
  away_team text not null,
  starts_at timestamptz not null,
  status text not null default 'scheduled',
  home_score integer,
  away_score integer,
  result text not null default 'pending' check (result in ('pending','home','away','tie','void')),
  source_payload jsonb not null default '{}'::jsonb,
  provider_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_sport, provider_game_id)
);

create table if not exists public.tn_pickem_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'apisports',
  action text not null,
  status text not null,
  requests_made integer not null default 0,
  events_received integer not null default 0,
  events_upserted integer not null default 0,
  games_selected integer not null default 0,
  error_code text,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.tn_pickem_provider_state (
  provider text not null default 'apisports',
  provider_sport text not null,
  last_schedule_sync_at timestamptz,
  last_live_sync_at timestamptz,
  last_status text,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key(provider, provider_sport)
);

create index if not exists tn_pickem_provider_events_start_idx
  on public.tn_pickem_provider_events(starts_at, status);
create index if not exists tn_pickem_provider_events_sport_idx
  on public.tn_pickem_provider_events(provider_sport, starts_at);
create index if not exists tn_pickem_sync_runs_started_idx
  on public.tn_pickem_sync_runs(started_at desc);
create index if not exists tn_pickem_weeks_season_idx
  on public.tn_pickem_weeks(season_year, week_number);

alter table public.tn_pickem_provider_events enable row level security;
alter table public.tn_pickem_sync_runs enable row level security;
alter table public.tn_pickem_provider_state enable row level security;
revoke all on public.tn_pickem_provider_events from anon, authenticated;
revoke all on public.tn_pickem_sync_runs from anon, authenticated;
revoke all on public.tn_pickem_provider_state from anon, authenticated;
grant all on public.tn_pickem_provider_events to service_role;
grant all on public.tn_pickem_sync_runs to service_role;
grant all on public.tn_pickem_provider_state to service_role;

create or replace function public.tn_pickem_submit(
  p_week_slug text,
  p_display_name text,
  p_picks jsonb,
  p_entry_token uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_week public.tn_pickem_weeks%rowtype;
  v_entry_id uuid;
  v_existing jsonb := '{}'::jsonb;
  v_merged jsonb := '{}'::jsonb;
  v_game jsonb;
  v_game_id text;
  v_pick text;
  v_start timestamptz;
  v_expected integer := 0;
  v_submitted integer := 0;
begin
  if p_entry_token is null then raise exception 'A browser entry token is required'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) < 2 or char_length(btrim(p_display_name)) > 24 then
    raise exception 'Choose a nickname between 2 and 24 characters';
  end if;
  if p_picks is null or jsonb_typeof(p_picks) <> 'object' then
    raise exception 'Complete your picks before submitting';
  end if;

  select * into v_week
  from public.tn_pickem_weeks
  where slug = p_week_slug and status = 'open'
  for update;
  if not found then raise exception 'This pick’em week is not currently open'; end if;

  select e.id, e.picks into v_entry_id, v_existing
  from public.tn_pickem_entries e
  where e.week_id = v_week.id and e.entry_token = p_entry_token;
  v_existing := coalesce(v_existing, '{}'::jsonb);
  v_merged := v_existing;

  for v_game in select value from jsonb_array_elements(v_week.games)
  loop
    v_game_id := v_game ->> 'id';
    if v_game_id is null or v_game_id = '' then raise exception 'A matchup is missing its identifier'; end if;
    v_start := nullif(v_game ->> 'starts_at','')::timestamptz;
    if v_start is null or v_start > now() then
      v_expected := v_expected + 1;
      v_pick := p_picks ->> v_game_id;
      if v_pick is null or v_pick not in ('home','away','tie') then
        raise exception 'Make a valid pick for every matchup that has not started';
      end if;
      if v_pick = 'tie' and coalesce((v_game ->> 'allow_tie')::boolean,false) is false then
        raise exception 'A tie is not an available result for this matchup';
      end if;
      v_merged := jsonb_set(v_merged, array[v_game_id], to_jsonb(v_pick), true);
    end if;
  end loop;

  select count(*) into v_submitted from jsonb_object_keys(p_picks);
  if v_expected = 0 then raise exception 'All matchups have started; picks are locked'; end if;
  if v_submitted <> v_expected then raise exception 'Submit picks only for matchups that have not started'; end if;

  if v_entry_id is null then
    insert into public.tn_pickem_entries (week_id, entry_token, display_name, picks)
    values (v_week.id, p_entry_token, btrim(p_display_name), v_merged)
    returning id into v_entry_id;
  else
    update public.tn_pickem_entries
    set display_name = btrim(p_display_name),
        picks = v_merged,
        updated_at = now()
    where id = v_entry_id;
  end if;
  return v_entry_id;
end;
$function$;

revoke all on function public.tn_pickem_submit(text,text,jsonb,uuid) from public;
grant execute on function public.tn_pickem_submit(text,text,jsonb,uuid) to anon, authenticated;

create or replace function public.tn_pickem_reconcile_week(p_week_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_week public.tn_pickem_weeks%rowtype;
  v_total integer := 0;
  v_resolved integer := 0;
  v_updated integer := 0;
  v_status text;
begin
  select * into v_week
  from public.tn_pickem_weeks
  where slug = p_week_slug
  for update;
  if not found then return jsonb_build_object('ok',false,'error','week_not_found'); end if;

  select count(*),
         count(*) filter (where coalesce(g->>'result','pending') in ('home','away','tie','void'))
  into v_total, v_resolved
  from jsonb_array_elements(v_week.games) g;

  if v_total > 0 and v_resolved = v_total then
    v_status := 'completed';
  elsif not exists (
    select 1 from jsonb_array_elements(v_week.games) g
    where nullif(g->>'starts_at','')::timestamptz > now()
  ) then
    v_status := 'locked';
  else
    v_status := 'open';
  end if;

  update public.tn_pickem_entries e
  set points = calc.points,
      correct_picks = calc.points,
      scored_at = now(),
      updated_at = now()
  from (
    select e2.id,
      coalesce(sum(case
        when g->>'result' in ('home','away','tie')
         and e2.picks->>(g->>'id') = g->>'result' then 1 else 0 end),0)::integer as points
    from public.tn_pickem_entries e2
    cross join lateral jsonb_array_elements(v_week.games) g
    where e2.week_id = v_week.id
    group by e2.id
  ) calc
  where e.id = calc.id;
  get diagnostics v_updated = row_count;

  update public.tn_pickem_weeks
  set status = v_status,
      completed_at = case when v_status = 'completed' then coalesce(completed_at,now()) else null end,
      updated_at = now()
  where id = v_week.id;

  return jsonb_build_object('ok',true,'week_slug',p_week_slug,'status',v_status,
    'games_total',v_total,'games_resolved',v_resolved,'entries_scored',v_updated);
end;
$function$;

revoke all on function public.tn_pickem_reconcile_week(text) from public, anon, authenticated;
grant execute on function public.tn_pickem_reconcile_week(text) to service_role;

create or replace view public.tn_pickem_season_leaderboard as
select
  w.season_year,
  lower(btrim(e.display_name)) as player_key,
  (array_agg(e.display_name order by e.updated_at desc))[1] as display_name,
  sum(e.points)::integer as points,
  sum(e.correct_picks)::integer as correct_picks,
  count(distinct e.week_id)::integer as weeks_played
from public.tn_pickem_entries e
join public.tn_pickem_weeks w on w.id = e.week_id
where w.status in ('locked','completed')
group by w.season_year, lower(btrim(e.display_name));

grant select on public.tn_pickem_season_leaderboard to anon, authenticated;

create or replace function public.tn_pickem_validate_worker_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $function$
declare v_expected text;
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  select decrypted_secret into v_expected
  from vault.decrypted_secrets
  where name = 'tn_pickem_worker_token'
  limit 1;
  return v_expected is not null and v_expected = p_token;
end;
$function$;
revoke all on function public.tn_pickem_validate_worker_token(text) from public, anon, authenticated;
grant execute on function public.tn_pickem_validate_worker_token(text) to service_role;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='tn_pickem_worker_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'tn_pickem_worker_token',
      'Private worker token for the Tacoma Nights API-Sports Pick’em automation');
  end if;
end $$;

select cron.schedule(
  'tn-pickem-apisports-worker',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := 'https://cevylpnoexugwgygvtgu.supabase.co/functions/v1/tn-pickem-apisports-sync',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-pickem-worker-token',(select decrypted_secret from vault.decrypted_secrets where name='tn_pickem_worker_token')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);
