# Tacoma Nights Pick'em — API-Sports setup

## Integration status

The API-Sports Edge Function and database automation are deployed. The 30-minute Supabase Cron job is active. The provider key is intentionally not stored in GitHub or in the public Pick'em page.

**One required setup step:** add the API-Sports key as a Supabase Edge Function secret named `APISPORTS_API_KEY`.

1. Open [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/cevylpnoexugwgygvtgu/functions/secrets).
2. Add a secret with name `APISPORTS_API_KEY`.
3. Paste the API key from the API-Sports dashboard into the value field.
4. Save. Do not put the key in GitHub, website JavaScript, or a public issue.
5. The next scheduled run (within 30 minutes) will start importing schedules and results. No redeploy is required after adding the secret.

The worker authentication token is generated and stored in Supabase Vault. It is not present in the repository or public page.

## Supported competitions

- NFL and NCAA football through API-Sports American Football
- NBA through API-Sports NBA
- NHL through API-Sports Hockey
- MLB through API-Sports Baseball
- Soccer fixtures from selected competitions: UEFA Champions League, Premier League, Ligue 1, Bundesliga, Serie A, La Liga, and MLS

The adapter keeps API-Sports events in dedicated `tn_pickem_*` tables. It does not replace or write to the existing SportsDataIO integration or `cr_sports_events` feed.

## Automation

- The Supabase Cron worker runs every 30 minutes.
- Upcoming schedules are refreshed once per day using a rolling seven-day window.
- Scores are refreshed every 30 minutes only for sports with unresolved games scheduled today.
- The weekly slate automatically selects up to 15 upcoming matchups, with a maximum of four selections per sport category when enough games are available.
- The weekly slate is published automatically; routine manual approval is not required.
- Each matchup locks at its own scheduled start time. Picks for later games can still be submitted after earlier games begin.
- A correct pick is worth one point. NFL and soccer include a tie/draw option; other selected sports do not.
- Final provider results are reconciled into weekly points and the season leaderboard. Postponed games remain pending; cancelled/abandoned/walkover fixtures are voided.

## Operations and monitoring

- `public.tn_pickem_sync_runs` stores provider run outcomes, request counts, imported records, slate size, and errors.
- `public.tn_pickem_provider_state` tracks schedule and live-score sync timestamps by API.
- `public.tn_pickem_provider_events` stores normalized API-Sports games and provider payloads. These tables are not exposed to anonymous clients.
- The public page reads the curated weekly slate and leaderboard views only.

API-Sports quotas and competition coverage depend on the subscribed plan. The worker intentionally avoids rapid polling and should be reviewed against the actual plan limits before increasing frequency.
