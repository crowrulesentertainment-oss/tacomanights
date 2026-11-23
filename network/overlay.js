(()=>{"use strict";
const c=window.TACOMA_NIGHTS_CONFIG||{},$=id=>document.getElementById(id),root=$("broadcast-overlay");
const params=new URLSearchParams(location.search),allowed=["lower-third","next","schedule","full","breaking","guest","social","quote","score","countdown","logo"];
let mode=allowed.includes(params.get("mode"))?params.get("mode"):"lower-third",timer=null,channel=null;
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v||"";};
const fmt=v=>{if(!v)return"Time to be announced";const d=new Date(v);return new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"short",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(d);};
function setMode(next){mode=allowed.includes(next)?next:"lower-third";root.className="overlay mode-"+mode;}
function setHidden(hidden){root.classList.toggle("is-hidden",!!hidden);}
function applyGraphic(g){
 if(!g)return;setMode(g.mode||mode);root.style.setProperty("--red",g.color||"#e74759");root.style.setProperty("--gold",g.secondary||"#e6bd70");
 const title=g.title||"Tacoma Nights",subtitle=g.subtitle||"",kicker=g.kicker||"CROW RULES ENTERTAINMENT",host=g.host||"";
 set("custom-title",title);set("custom-subtitle",subtitle);set("custom-kicker",kicker);set("custom-host",host);
 set("current-title",title);set("current-meta",[host,subtitle].filter(Boolean).join(" · "));set("current-kicker",kicker);
 set("slate-title",title);set("slate-subtitle",subtitle);set("next-title",title);set("strip-current",title);
 root.classList.add("custom-active");
}
function command(payload){
 if(!payload)return;
 if(payload.action==="hide"){setHidden(true);return;}
 if(payload.graphic){applyGraphic(payload.graphic);if(payload.action==="show")setHidden(false);}
}
function startRealtime(){
 if(!window.supabase?.createClient||!c.supabaseUrl||!c.supabaseAnonKey)return;
 try{
  const client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
  channel=client.channel("tacoma-nights-onair-graphics-v1",{config:{broadcast:{self:false}}});
  channel.on("broadcast",{event:"graphics-command"},({payload})=>command(payload));
  channel.subscribe();
 }catch(e){console.warn("Graphics realtime unavailable",e);}
}
async function load(){
 if(!c.supabaseUrl||!c.supabaseAnonKey)return;
 try{
  const url=c.supabaseUrl.replace(/\/$/,"")+"/rest/v1/live_network_public_state?select=network_name,public_status,current_program_title,current_host,description,next_program_title,next_program_starts_at,updated_at&is_published=eq.true&limit=1";
  const r=await fetch(url,{headers:{apikey:c.supabaseAnonKey,Authorization:"Bearer "+c.supabaseAnonKey},cache:"no-store"});if(!r.ok)throw Error("Network state request failed");
  const s=(await r.json())[0]||{},title=s.current_program_title||"Network programming",meta=[s.current_host?"Hosted by "+s.current_host:"",s.description||"Live from Tacoma, Washington"].filter(Boolean).join(" · "),next=s.next_program_title||"Next program to be announced",when=fmt(s.next_program_starts_at);
  set("current-title",title);set("current-meta",meta);set("current-kicker",String(s.public_status||"").toLowerCase()==="live"?"NOW PLAYING · LIVE":"NOW PLAYING · TACOMA NIGHTS NETWORK");set("next-title",next);set("next-time",when);set("strip-current",title);set("strip-next",next+" · "+when);set("slate-title",title);set("slate-subtitle",meta);set("slate-next-title",next);set("slate-next-time",when);
  const live=String(s.public_status||"").toLowerCase()==="live",indicator=$("live-indicator");indicator.textContent=live?"LIVE":"NETWORK";indicator.classList.toggle("live",live);$("overlay-error").hidden=true;
 }catch(e){$("overlay-error").hidden=false;set("overlay-error","NETWORK DATA UNAVAILABLE · "+e.message);}
}
window.addEventListener("message",event=>{if(event.data?.type==="tacoma-graphics-command")command(event.data.payload);});
setMode(mode);if(params.get("hidden")==="1")setHidden(true);load();startRealtime();timer=setInterval(load,15000);
})();