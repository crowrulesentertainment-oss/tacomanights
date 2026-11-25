import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? ""; } catch { return ""; } })();
const API_KEY = Deno.env.get("APISPORTS_API_KEY") ?? "";
const db = createClient(PROJECT_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
type SportConfig = { key: string; host: string; path: string; sport: string; label: string };
const SPORTS: SportConfig[] = [
 {key:"american-football",host:"https://v1.american-football.api-sports.io",path:"games",sport:"football",label:"American Football"},
 {key:"nba",host:"https://v2.nba.api-sports.io",path:"games",sport:"basketball",label:"NBA"},
 {key:"hockey",host:"https://v1.hockey.api-sports.io",path:"games",sport:"hockey",label:"Hockey"},
 {key:"baseball",host:"https://v1.baseball.api-sports.io",path:"games",sport:"baseball",label:"Baseball"},
 {key:"football",host:"https://v3.football.api-sports.io",path:"fixtures",sport:"soccer",label:"Soccer"}
];
const SOCCER_LEAGUES=new Set(["2","39","61","78","135","140","253"]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const calendarDate=(d:Date)=>{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);const get=(k:string)=>p.find(x=>x.type===k)?.value||"00";return get("year")+"-"+get("month")+"-"+get("day");};
const datePlus=(date:string,days:number)=>{const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const pacificMidnight=(date:string)=>{const guess=new Date(date+"T00:00:00Z");const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",timeZoneName:"shortOffset"}).formatToParts(guess);const zone=parts.find(x=>x.type==="timeZoneName")?.value||"GMT-8";const match=zone.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);const minutes=match?(Number(match[2])*60+Number(match[3]||0))*(match[1]==="-"?-1:1):-480;return new Date(guess.getTime()-minutes*60000);};
const isoWeek=(date:Date)=>{const [y,m,d]=calendarDate(date).split("-").map(Number);const dayDate=new Date(Date.UTC(y,m-1,d));const day=dayDate.getUTCDay()||7;dayDate.setUTCDate(dayDate.getUTCDate()+4-day);const year=dayDate.getUTCFullYear();const yearStart=new Date(Date.UTC(year,0,1));return {year,week:Math.ceil((((dayDate.getTime()-yearStart.getTime())/86400000)+1)/7)};};
const weekBounds=(date:Date)=>{const [y,m,d]=calendarDate(date).split("-").map(Number);const startDay=new Date(Date.UTC(y,m-1,d));const weekday=startDay.getUTCDay()||7;startDay.setUTCDate(startDay.getUTCDate()-weekday+1);const startDate=startDay.toISOString().slice(0,10),endDate=datePlus(startDate,7);return {start:pacificMidnight(startDate),end:pacificMidnight(endDate),startDate,endDate};};
const str=(v:unknown)=>typeof v==="string"||typeof v==="number"?String(v):"";
const obj=(v:any)=>v&&typeof v==="object"?v:{};
const first=(...values:unknown[])=>values.find(v=>v!==undefined&&v!==null&&v!=="");
const scoreNumber=(v:unknown):number|null=>{if(v===undefined||v===null||v==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0?Math.trunc(n):null;};
const statusText=(v:any)=>str(first(v?.short,v?.long,v)).toUpperCase();
const isFinalStatus=(s:string)=>["FT","AET","PEN","FINAL","FINISHED","F","GAME OVER","ENDED","COMPLETE","COMPLETED"].includes(s)||s.includes("FINISHED")||s.includes("FINAL");
const isVoidStatus=(s:string)=>["CANC","CANCELLED","CANCELED","ABD","ABANDONED","WO","WALKOVER"].includes(s);
const allowTie=(sport:string)=>sport==="soccer"||sport==="nfl";
function normalizeRow(row:any,cfg:SportConfig){
 const fixture=obj(row.fixture),game=obj(row.game),teams=obj(row.teams),league=obj(row.league),home=obj(teams.home),away=obj(teams.away);
 const rawId=first(fixture.id,game.id,row.id,row.game_id);
 const dateRaw=first(fixture.date,game.date?.date,game.date,row.date,row.datetime,row.start_time);
 const starts=dateRaw?new Date(String(dateRaw)):null;
 const homeName=str(first(home.name,row.home?.name,row.home_team,row.homeTeam,row.home));
 const awayName=str(first(away.name,row.away?.name,row.away_team,row.awayTeam,row.away));
 if(!rawId||!homeName||!awayName||!starts||Number.isNaN(starts.getTime()))return null;
 const state=statusText(first(fixture.status,game.status,row.status)),scores=obj(row.scores),goals=obj(row.goals);
 const homeScore=scoreNumber(first(goals.home,scores.home?.total,scores.home?.points,scores.home,row.home_score));
 const awayScore=scoreNumber(first(goals.away,scores.away?.total,scores.away?.points,scores.away,row.away_score));
 const leagueId=str(first(league.id,row.league_id)),leagueName=str(first(league.name,row.league,row.competition,cfg.label))||cfg.label;
 let sport=cfg.sport;
 if(cfg.key==="american-football"){
  const lower=leagueName.toLowerCase();
  if(/ncaa|college|ncaaf/.test(lower))sport="cfb";
  else if(/\\bnfl\\b/.test(lower))sport="nfl";
  else return null;
 }
 let result="pending";
 if(isVoidStatus(state))result="void";
 else if(isFinalStatus(state)&&homeScore!==null&&awayScore!==null)result=homeScore>awayScore?"home":awayScore>homeScore?"away":"tie";
 return {provider:"apisports",provider_sport:cfg.key,provider_game_id:String(rawId),sport,league:leagueName,league_id:leagueId||null,home_team:homeName,away_team:awayName,starts_at:starts.toISOString(),status:state||"NS",home_score:homeScore,away_score:awayScore,result,source_payload:row,provider_updated_at:new Date().toISOString(),last_synced_at:new Date().toISOString()};
}
async function apiGet(cfg:SportConfig,params:Record<string,string>){
 const url=new URL(cfg.host+"/"+cfg.path);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 const response=await fetch(url,{headers:{"x-apisports-key":API_KEY,"accept":"application/json"},signal:AbortSignal.timeout(18000)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(cfg.key+" HTTP "+response.status);
 if(payload?.errors&&Object.keys(payload.errors).length)throw new Error(cfg.key+" API error: "+JSON.stringify(payload.errors).slice(0,300));
 return Array.isArray(payload?.response)?payload.response:[];
}
async function upsertRows(rows:any[]){if(!rows.length)return 0;const {error}=await db.from("tn_pickem_provider_events").upsert(rows,{onConflict:"provider,provider_sport,provider_game_id"});if(error)throw new Error("Event upsert failed: "+error.message);return rows.length;}
async function getState(key:string){const {data}=await db.from("tn_pickem_provider_state").select("*").eq("provider","apisports").eq("provider_sport",key).maybeSingle();return data;}
async function setState(key:string,patch:Record<string,unknown>){const {error}=await db.from("tn_pickem_provider_state").upsert({provider:"apisports",provider_sport:key,...patch,updated_at:new Date().toISOString()},{onConflict:"provider,provider_sport"});if(error)throw error;}
async function fetchSchedule(cfg:SportConfig,now:Date){
 const rows:any[]=[];
 if(cfg.key==="football"){const data=await apiGet(cfg,{from:calendarDate(now),to:datePlus(calendarDate(now),6),timezone:"America/Los_Angeles"});for(const item of data){const n=normalizeRow(item,cfg);if(n&&SOCCER_LEAGUES.has(String(n.league_id)))rows.push(n);}}
 else{for(let i=0;i<7;i++){const data=await apiGet(cfg,{date:datePlus(calendarDate(now),i),timezone:"America/Los_Angeles"});for(const item of data){const n=normalizeRow(item,cfg);if(n)rows.push(n);}}}
 return rows;
}
async function fetchToday(cfg:SportConfig,now:Date){return cfg.key==="football"?await apiGet(cfg,{live:"all",timezone:"America/Los_Angeles"}):await apiGet(cfg,{date:calendarDate(now),timezone:"America/Los_Angeles"});}
function chooseSlate(events:any[]){
 const groups=new Map<string,any[]>();
 for(const e of events){const s=e.sport==="cfb"?"cfb":e.sport;const list=groups.get(s)||[];list.push(e);groups.set(s,list);}
 const priority=["nfl","cfb","basketball","hockey","baseball","soccer"];
 for(const list of groups.values())list.sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
 const selected:any[]=[];
 while(selected.length<15){let added=false;for(const sport of priority){const list=groups.get(sport);if(list?.length&&selected.filter(x=>(x.sport==="cfb"?"cfb":x.sport)===sport).length<4&&selected.length<15){selected.push(list.shift());added=true;}}if(!added)break;}
 return selected;
}
function toGame(e:any){return {id:e.provider_sport+":"+e.provider_game_id,provider_sport:e.provider_sport,provider_game_id:e.provider_game_id,sport:String(e.sport).toUpperCase(),league:e.league,home:e.home_team,away:e.away_team,starts_at:e.starts_at,status:e.status,home_score:e.home_score,away_score:e.away_score,result:e.result,allow_tie:allowTie(e.sport)};}
async function publishSlate(now:Date){
 const {start,end}=weekBounds(now),iso=isoWeek(now);
 const query=()=>db.from("tn_pickem_provider_events").select("provider_sport,provider_game_id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,result").eq("provider","apisports").gte("starts_at",now.toISOString()).lt("starts_at",end.toISOString()).eq("result","pending");
 let {data:events,error}=await query();if(error)throw error;
 let selected=chooseSlate(events||[]),seasonYear=iso.year,weekNumber=iso.week,slug="tn-pickem-"+seasonYear+"-w"+String(weekNumber).padStart(2,"0");
 if(!selected.length){const nextIso=isoWeek(end);const {data:nextEvents,error:nextError}=await db.from("tn_pickem_provider_events").select("provider_sport,provider_game_id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,result").gte("starts_at",end.toISOString()).lt("starts_at",new Date(end.getTime()+7*86400000).toISOString()).eq("result","pending");if(nextError)throw nextError;selected=chooseSlate(nextEvents||[]);if(!selected.length)return {published:false,selected:0,reason:"no_upcoming_games"};seasonYear=nextIso.year;weekNumber=nextIso.week;slug="tn-pickem-"+seasonYear+"-w"+String(weekNumber).padStart(2,"0");}
 const {data:existing}=await db.from("tn_pickem_weeks").select("id,games,status").eq("slug",slug).maybeSingle();
 if(existing&&existing.status!=="open")return {published:false,selected:0,reason:"week_already_locked_or_completed"};
 const selectedGames=selected.map(toGame),started=(existing?.games||[]).filter((g:any)=>g.starts_at&&new Date(g.starts_at).getTime()<=now.getTime());
 const byId=new Map<string,any>();for(const g of [...started,...selectedGames])byId.set(g.id,g);
 const games=Array.from(byId.values()).sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,15);
 if(!games.length)return {published:false,selected:0,reason:"empty_slate"};
 const latest=new Date(Math.max(...games.map((g:any)=>new Date(g.starts_at).getTime())));
 const row={slug,title:"Tacoma Nights Pick’em — Week "+weekNumber+", "+seasonYear,description:"Choose the winners of up to 15 featured games across NFL, college football, NBA, NHL, MLB and selected soccer competitions. Picks lock individually at kickoff.",lock_at:latest.toISOString(),games,status:"open",season_year:seasonYear,week_number:weekNumber,provider:"apisports",auto_generated:true,generated_at:now.toISOString(),updated_at:now.toISOString()};
 const {error:writeError}=await db.from("tn_pickem_weeks").upsert(row,{onConflict:"slug"});if(writeError)throw new Error("Weekly slate publish failed: "+writeError.message);
 return {published:true,slug,selected:games.length,seasonYear,weekNumber};
}
async function refreshWeekResults(){
 const {data:weeks,error}=await db.from("tn_pickem_weeks").select("id,slug,games,status").in("status",["open","locked"]).eq("provider","apisports");if(error)throw error;
 let scored=0;
 for(const week of weeks||[]){
  const games=Array.isArray(week.games)?week.games:[];if(!games.length)continue;
  const ids=games.map((g:any)=>g.provider_game_id).filter(Boolean);
  const {data:events}=await db.from("tn_pickem_provider_events").select("provider_sport,provider_game_id,status,home_score,away_score,result").eq("provider","apisports").in("provider_game_id",ids);
  const eventMap=new Map((events||[]).map((e:any)=>[e.provider_sport+":"+e.provider_game_id,e]));
  const updated=games.map((g:any)=>{const e=eventMap.get(g.provider_sport+":"+g.provider_game_id);return e?{...g,status:e.status,home_score:e.home_score,away_score:e.away_score,result:e.result}:g;});
  const {error:updateError}=await db.from("tn_pickem_weeks").update({games:updated,updated_at:new Date().toISOString()}).eq("id",week.id);if(updateError)throw updateError;
  const {error:scoreError}=await db.rpc("tn_pickem_reconcile_week",{p_week_slug:week.slug});if(scoreError)throw new Error("Pick'em scoring failed: "+scoreError.message);scored++;
 }
 return scored;
}
async function logRun(row:Record<string,unknown>){const {error}=await db.from("tn_pickem_sync_runs").insert({...row,finished_at:new Date().toISOString()});if(error)console.error("Pick'em audit insert failed",error.message);}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(!PROJECT_URL||!SERVICE_KEY)return json({error:"supabase_service_configuration_missing"},503);
 const token=req.headers.get("x-pickem-worker-token")||"";
 const {data:authorized,error:authError}=await db.rpc("tn_pickem_validate_worker_token",{p_token:token});
 if(authError||authorized!==true)return json({error:"unauthorized_worker"},401);
 if(!API_KEY){const {data:recent}=await db.from("tn_pickem_sync_runs").select("id").eq("provider","apisports").eq("status","blocked").gte("started_at",new Date(Date.now()-20*60*60*1000).toISOString()).limit(1);if(!recent?.length)await logRun({provider:"apisports",action:"scheduled_sync",status:"blocked",error_code:"APISPORTS_API_KEY_MISSING",error_message:"Add APISPORTS_API_KEY to Supabase Edge Function secrets. No provider requests were made."});return json({ok:false,blocked:true,error:"APISPORTS_API_KEY_MISSING",message:"Add APISPORTS_API_KEY to Supabase Edge Function secrets. No provider requests were made."},503);}
 const started=Date.now(),now=new Date();let requests=0,received=0,upserted=0,slate:any=null,scored=0;
 try{
  const sportErrors:any[]=[];
  for(const cfg of SPORTS){
   try{
    const state=await getState(cfg.key),today=calendarDate(now),lastSchedule=state?.last_schedule_sync_at?calendarDate(new Date(state.last_schedule_sync_at)):"";
    if(lastSchedule!==today){const rows=await fetchSchedule(cfg,now);requests+=cfg.key==="football"?1:7;received+=rows.length;upserted+=await upsertRows(rows);await setState(cfg.key,{last_schedule_sync_at:now.toISOString(),last_status:"schedule_ok",last_error:null});}
    const midnight=pacificMidnight(today).toISOString(),tomorrow=pacificMidnight(datePlus(today,1)).toISOString();
    const {count:activeCount}=await db.from("tn_pickem_provider_events").select("id",{count:"exact",head:true}).eq("provider","apisports").eq("provider_sport",cfg.key).gte("starts_at",midnight).lt("starts_at",tomorrow).eq("result","pending");
    if((activeCount||0)>0){const raw=await fetchToday(cfg,now);requests++;received+=raw.length;const rows=raw.map((r:any)=>normalizeRow(r,cfg)).filter(Boolean);upserted+=await upsertRows(rows);await setState(cfg.key,{last_live_sync_at:now.toISOString(),last_status:"live_ok",last_error:null});}
   }catch(sportError){const message=sportError instanceof Error?sportError.message:"Provider sport sync failed";sportErrors.push({sport:cfg.key,message});await setState(cfg.key,{last_status:"error",last_error:message}).catch(()=>{});}
  }
  slate=await publishSlate(now);scored=await refreshWeekResults();
  const runStatus=sportErrors.length?"partial":"success";
  await logRun({provider:"apisports",action:"scheduled_sync",status:runStatus,requests_made:requests,events_received:received,events_upserted:upserted,games_selected:slate?.selected||0,error_code:sportErrors.length?"APISPORTS_PARTIAL_FAILURE":null,error_message:sportErrors.length?sportErrors.map(e=>e.sport+": "+e.message).join("; ").slice(0,1500):null,details:{slate,scoredWeeks:scored,sportErrors,durationMs:Date.now()-started}});
  return json({ok:sportErrors.length===0,requests,eventsReceived:received,eventsUpserted:upserted,slate,scoredWeeks:scored,sportErrors,durationMs:Date.now()-started});
 }catch(error){const message=error instanceof Error?error.message:"Unknown API-Sports sync failure";await logRun({provider:"apisports",action:"scheduled_sync",status:"error",requests_made:requests,events_received:received,events_upserted:upserted,games_selected:slate?.selected||0,error_code:"APISPORTS_SYNC_FAILED",error_message:message,details:{durationMs:Date.now()-started}});return json({ok:false,error:"APISPORTS_SYNC_FAILED",message,requests,eventsReceived:received,eventsUpserted:upserted},502);}
});
