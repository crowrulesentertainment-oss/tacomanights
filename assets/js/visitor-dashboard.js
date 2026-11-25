(()=>{"use strict";
if(window.__tnVisitorDashboardStarted)return;
window.__tnVisitorDashboardStarted=true;
const cfg=window.TACOMA_NIGHTS_CONFIG||{};
const $=s=>document.querySelector(s);
const clock=$("#tn-visitor-clock"),date=$("#tn-visitor-date"),zone=$("#tn-visitor-zone");
const weather=$("#tn-visitor-weather"),place=$("#tn-visitor-place"),weatherNote=$("#tn-weather-note");
const count=$("#tn-home-view-count"),countNote=$("#tn-view-count-note"),locate=$("#tn-use-location");
const liveCount=$("#tn-live-visitor-count"),liveNote=$("#tn-live-visitor-note");
const TACOMA={lat:47.2529,lon:-122.4443,label:"Tacoma, Washington"};
const PACIFIC="America/Los_Angeles";
const timeFmt=new Intl.DateTimeFormat("en-US",{timeZone:PACIFIC,hour:"numeric",minute:"2-digit",second:"2-digit"});
const dateFmt=new Intl.DateTimeFormat("en-US",{timeZone:PACIFIC,weekday:"long",year:"numeric",month:"long",day:"numeric"});
const zoneFmt=new Intl.DateTimeFormat("en-US",{timeZone:PACIFIC,timeZoneName:"short"});
function tick(){
 const now=new Date();
 if(clock)clock.textContent=timeFmt.format(now);
 if(date)date.textContent=dateFmt.format(now);
 if(zone){const tz=zoneFmt.formatToParts(now).find(p=>p.type==="timeZoneName")?.value||"Pacific Time";zone.textContent="Tacoma · "+PACIFIC+" · "+tz;}
}
tick();
const clockTimer=window.setInterval(()=>{if(!document.hidden)tick()},1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
function condition(code){
 if(code===0)return["☀️","Clear sky"];
 if([1,2].includes(code))return["🌤️","Mostly clear"];
 if(code===3)return["☁️","Cloudy"];
 if([45,48].includes(code))return["🌫️","Fog"];
 if([51,53,55,56,57].includes(code))return["🌦️","Drizzle"];
 if([61,63,65,66,67,80,81,82].includes(code))return["🌧️","Rain"];
 if([71,73,75,77,85,86].includes(code))return["❄️","Snow"];
 if([95,96,99].includes(code))return["⛈️","Thunderstorm"];
 return["🌡️","Current conditions"];
}
async function fetchJson(url,timeoutMs=9000){
 const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(url,{cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error("Request failed ("+response.status+")");return await response.json();}
 finally{window.clearTimeout(timer);}
}
let weatherRequest=0;
async function loadWeather(lat,lon,label,requestId){
 try{
  const url=new URL("https://api.open-meteo.com/v1/forecast");
  url.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",temperature_unit:"fahrenheit",wind_speed_unit:"mph",timezone:"auto"});
  const data=await fetchJson(url.toString());
  if(requestId!==weatherRequest)return;
  const current=data.current;
  if(!current||!Number.isFinite(Number(current.temperature_2m)))throw new Error("Weather data was incomplete");
  const [emoji,description]=condition(Number(current.weather_code));
  if(weather)weather.textContent=emoji+" "+Math.round(current.temperature_2m)+"°F";
  if(place)place.textContent=label||String(data.timezone||"Your area").replaceAll("_"," ");
  if(weatherNote)weatherNote.textContent=description+" · Feels like "+Math.round(current.apparent_temperature)+"°F · Wind "+Math.round(current.wind_speed_10m)+" mph · Humidity "+Math.round(current.relative_humidity_2m)+"%";
  return true;
 }catch(error){
  if(requestId!==weatherRequest)return;
  console.warn("Tacoma Nights weather unavailable",error);
  if(weather)weather.textContent="Weather unavailable";
  if(weatherNote)weatherNote.textContent="Live weather could not be loaded. Please try again shortly.";
  return false;
 }
}
async function approximateLocation(){
 const requestId=++weatherRequest;
 try{
  const data=await fetchJson("https://ipwho.is/",7000);
  if(requestId!==weatherRequest)return;
  if(!data.success||!Number.isFinite(Number(data.latitude))||!Number.isFinite(Number(data.longitude)))throw new Error("Approximate location unavailable");
  const label=[data.city,data.region_code||data.region,data.country].filter(Boolean).join(", ");
  const loaded=await loadWeather(Number(data.latitude),Number(data.longitude),label||"Approximate local area",requestId);
  if(!loaded&&requestId===weatherRequest){const fallbackLoaded=await loadWeather(TACOMA.lat,TACOMA.lon,TACOMA.label+" · local fallback",requestId);if(fallbackLoaded&&weatherNote)weatherNote.textContent+=" · Nearby weather was unavailable; showing Tacoma conditions.";}
 }catch(error){
  if(requestId!==weatherRequest)return;
  console.info("Using Tacoma weather fallback",error);
  await loadWeather(TACOMA.lat,TACOMA.lon,TACOMA.label+" · local fallback",requestId);
  if(requestId===weatherRequest&&weatherNote)weatherNote.textContent+=" · Approximate location detection was unavailable.";
 }
}
if(locate)locate.addEventListener("click",()=>{
 if(!navigator.geolocation){if(weatherNote)weatherNote.textContent="This browser does not support location services. Showing approximate local weather.";return;}
 const requestId=++weatherRequest;
 locate.disabled=true;locate.textContent="Finding location…";
 navigator.geolocation.getCurrentPosition(async position=>{
  if(requestId!==weatherRequest)return;
  await loadWeather(position.coords.latitude,position.coords.longitude,"Your selected location",requestId);
  if(locate){locate.disabled=false;locate.textContent="Refresh my weather";}
 },()=>{
  if(requestId!==weatherRequest)return;
  if(locate){locate.disabled=false;locate.textContent="Try my location again";}
  if(weatherNote)weatherNote.textContent="Location permission was not granted. Showing approximate area weather.";
  approximateLocation();
 },{enableHighAccuracy:false,timeout:10000,maximumAge:900000});
});
if(weather)weather.textContent="Loading…";
if(place)place.textContent="Finding your area";
approximateLocation();
function makeUuid(){
 if(window.crypto?.randomUUID)return window.crypto.randomUUID();
 return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)});
}
function getStoredUuid(storageName,key){
 try{const storage=window[storageName];let value=storage.getItem(key);if(!value){value=makeUuid();storage.setItem(key,value)}return value}catch(error){console.info("Visitor storage unavailable; using a temporary session ID.",error);return makeUuid()}
}
const visitorId=getStoredUuid("localStorage","tn-production-visitor-v1");
const sessionId=getStoredUuid("sessionStorage","tn-site-session-v1");
let db=null;
async function updateLiveVisitors(){
 if(!db)return;
 try{
  const {data,error}=await db.rpc("tn_homepage_live_visitors",{p_session_id:sessionId,p_visitor_id:visitorId});
  if(error)throw error;
  if(liveCount)liveCount.textContent=Number(data||0).toLocaleString("en-US");
  if(liveNote)liveNote.textContent="Active homepage visitors · refreshed every 20 seconds";
 }catch(error){
  console.warn("Tacoma Nights live visitor count unavailable",error);
  if(liveCount)liveCount.textContent="—";
  if(liveNote)liveNote.textContent="Live visitor count temporarily unavailable.";
 }
}
async function views(){
 if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase?.createClient){
  if(count)count.textContent="—";
  if(countNote)countNote.textContent="Visitor counter is not configured.";
  if(liveNote)liveNote.textContent="Live visitor count is not configured.";
  return;
 }
 try{
  db=window.__tnSupabaseClient||(window.__tnSupabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  const {error:insertError}=await db.from("tn_homepage_views").upsert({visitor_id:visitorId,page_path:"/tacomanights/index.html"},{onConflict:"visitor_id,page_path,visit_date",ignoreDuplicates:true});
  if(insertError)throw insertError;
  const result=await db.from("tn_homepage_views").select("id",{count:"exact",head:true}).eq("page_path","/tacomanights/index.html");
  if(result.error)throw result.error;
  if(count)count.textContent=Number(result.count||0).toLocaleString("en-US");
  if(countNote)countNote.textContent="Recorded homepage visits · one per browser per day";
  await updateLiveVisitors();
  window.setInterval(()=>{if(!document.hidden)updateLiveVisitors()},20000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateLiveVisitors()});
 }catch(error){
  console.warn("Tacoma Nights visitor counter unavailable",error);
  if(count)count.textContent="—";
  if(countNote)countNote.textContent="Visitor count temporarily unavailable.";
  if(liveCount)liveCount.textContent="—";
  if(liveNote)liveNote.textContent="Live visitor count temporarily unavailable.";
 }
}
views();
})();