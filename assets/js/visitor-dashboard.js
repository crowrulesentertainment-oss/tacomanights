(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{};
const $=s=>document.querySelector(s);
const clock=$("#tn-visitor-clock"),date=$("#tn-visitor-date"),zone=$("#tn-visitor-zone");
const weather=$("#tn-visitor-weather"),place=$("#tn-visitor-place"),weatherNote=$("#tn-weather-note");
const count=$("#tn-home-view-count"),countNote=$("#tn-view-count-note"),locate=$("#tn-use-location");
const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||"Local time";
const timeFmt=new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",second:"2-digit"});
const dateFmt=new Intl.DateTimeFormat(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
function tick(){const now=new Date();if(clock)clock.textContent=timeFmt.format(now);if(date)date.textContent=dateFmt.format(now);if(zone)zone.textContent=timeZone+" · "+new Intl.DateTimeFormat(undefined,{timeZoneName:"short"}).formatToParts(now).find(p=>p.type==="timeZoneName")?.value;}
tick();setInterval(()=>{if(!document.hidden)tick();},1000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick();});
function condition(code){if(code===0)return["☀️","Clear sky"];if([1,2].includes(code))return["🌤️","Mostly clear"];if(code===3)return["☁️","Cloudy"];if([45,48].includes(code))return["🌫️","Fog"];if([51,53,55,56,57].includes(code))return["🌦️","Drizzle"];if([61,63,65,66,67,80,81,82].includes(code))return["🌧️","Rain"];if([71,73,75,77,85,86].includes(code))return["❄️","Snow"];if([95,96,99].includes(code))return["⛈️","Thunderstorm"];return["🌡️","Current conditions"];}
async function getWeather(lat,lon,label){try{const u=new URL("https://api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:lat,longitude:lon,current:"temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",temperature_unit:"fahrenheit",wind_speed_unit:"mph",timezone:"auto"});const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("Weather unavailable");const d=await r.json(),v=d.current,[emoji,desc]=condition(v.weather_code);weather.textContent=emoji+" "+Math.round(v.temperature_2m)+"°F";place.textContent=label||d.timezone?.replaceAll("_"," ")||"Your area";weatherNote.textContent=desc+" · Feels like "+Math.round(v.apparent_temperature)+"°F · Wind "+Math.round(v.wind_speed_10m)+" mph · Humidity "+v.relative_humidity_2m+"%";}catch(e){weather.textContent="Weather unavailable";weatherNote.textContent="Live weather could not be loaded right now.";}}
async function approximateLocation(){try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);const r=await fetch("https://ipwho.is/",{cache:"no-store",signal:controller.signal});clearTimeout(timeout);if(!r.ok)throw Error("Location unavailable");const d=await r.json();if(!d.success||!Number.isFinite(Number(d.latitude))||!Number.isFinite(Number(d.longitude)))throw Error("Location unavailable");const label=[d.city,d.region_code||d.region,d.country].filter(Boolean).join(", ");await getWeather(d.latitude,d.longitude,label||"Approximate area");}catch(e){await getWeather(47.2529,-122.4443,"Tacoma, Washington · local fallback");if(weatherNote)weatherNote.textContent+=" · Approximate Tacoma conditions shown because automatic area detection was unavailable.";}}
if(locate)locate.addEventListener("click",()=>{if(!navigator.geolocation){weatherNote.textContent="This browser does not support location services.";return;}locate.disabled=true;locate.textContent="Finding location…";navigator.geolocation.getCurrentPosition(async p=>{await getWeather(p.coords.latitude,p.coords.longitude,"Your current location");locate.disabled=false;locate.textContent="Refresh my weather";},()=>{locate.disabled=false;locate.textContent="Try my location again";weatherNote.textContent="Location permission was not granted. Showing approximate area weather where available.";approximateLocation();},{enableHighAccuracy:false,timeout:10000,maximumAge:900000});});
approximateLocation();
let db=null;
let liveSession=null,visitorId=null;
async function updateLiveVisitors(){
 if(!db||!liveSession)return;
 const liveCount=$("#tn-live-visitor-count"),liveNote=$("#tn-live-visitor-note");
 try{
  const {data,error}=await db.rpc("tn_homepage_live_visitors",{p_session_id:liveSession,p_visitor_id:visitorId});
  if(error)throw error;
  if(liveCount)liveCount.textContent=Number(data||0).toLocaleString();
  if(liveNote)liveNote.textContent="Active homepage visitors · 20-second heartbeat · 65-second timeout";
 }catch(e){
  console.warn("Tacoma Nights live visitor count unavailable",e);
  if(liveCount)liveCount.textContent="—";
  if(liveNote)liveNote.textContent="Live visitor count temporarily unavailable.";
 }
}
async function views(){
 if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase){count.textContent="—";countNote.textContent="View counter is not configured.";return;}
 try{
  visitorId=localStorage.getItem("tn-production-visitor-v1");
  if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem("tn-production-visitor-v1",visitorId);}
  liveSession=sessionStorage.getItem("tn-site-session-v1");
  if(!liveSession){liveSession=crypto.randomUUID();sessionStorage.setItem("tn-site-session-v1",liveSession);}
  db=window.__tnSupabaseClient||(window.__tnSupabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  const {error}=await db.from("tn_homepage_views").insert({visitor_id:visitorId,page_path:"/tacomanights/index.html"});
  if(error&&error.code!=="23505")throw error;
  const result=await db.from("tn_homepage_views").select("id",{count:"exact",head:true});
  if(result.error)throw result.error;
  count.textContent=Number(result.count||0).toLocaleString();
  countNote.textContent="Recorded visits · one count per browser each day";
  await updateLiveVisitors();
  setInterval(()=>{if(!document.hidden)updateLiveVisitors();},20000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateLiveVisitors();});
 }catch(e){
  console.warn("Tacoma Nights visitor counter unavailable",e);
  count.textContent="—";countNote.textContent="Visitor count temporarily unavailable.";
 }
}
views();
})();