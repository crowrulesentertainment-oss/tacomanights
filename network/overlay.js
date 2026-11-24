(()=>{"use strict";
const $=id=>document.getElementById(id),root=$("broadcast-overlay"),params=new URLSearchParams(location.search);
const modes=["lower-third","next","schedule","full","breaking","guest","social","quote","score","countdown","logo","weather","event","announcement","poll","sponsor","headline","full-banner","side-panel","thankyou"];
let mode=modes.includes(params.get("mode"))?params.get("mode"):"lower-third",client=null,channel=null,autoHide=null,retryTimer=null;
const config=()=>window.TACOMA_NIGHTS_CONFIG||{};
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v==null?"":String(v);};
const fmt=v=>{if(!v)return"Time to be announced";const d=new Date(v);if(Number.isNaN(d.getTime()))return"Time to be announced";return new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"short",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(d);};
function setMode(next){mode=modes.includes(next)?next:"lower-third";root.className="overlay mode-"+mode;}
function hidden(value){root.classList.toggle("is-hidden",!!value);}
function hexRgba(hex,a){const h=String(hex||"").replace("#","");if(!/^[0-9a-f]{6}$/i.test(h))return"rgba(8,13,22,"+a+")";return"rgba("+parseInt(h.slice(0,2),16)+","+parseInt(h.slice(2,4),16)+","+parseInt(h.slice(4,6),16)+","+a+")";}
function applyGraphic(g){if(!g)return;setMode(g.mode||mode);root.classList.add("custom-active");const color=g.color||"#e74759",gold=g.secondary||"#e6bd70",opacity=Math.max(0,Math.min(100,Number(g.opacity??92)))/100;
root.style.setProperty("--red",color);root.style.setProperty("--gold",gold);root.style.setProperty("--custom-bg",hexRgba(g.background||"#080d16",opacity));root.style.setProperty("--custom-text",g.textColor||"#ffffff");root.style.setProperty("--custom-font",g.font||"Arial,Helvetica,sans-serif");
const box=$("custom-graphic");box.style.left=(Number(g.x)||0)+"%";box.style.top=(Number(g.y)||0)+"%";box.style.bottom="auto";box.style.width=(Number(g.width)||91)+"%";box.style.minHeight=(Number(g.height)||180)+"px";box.style.height="auto";box.style.textAlign=g.align||"left";box.style.setProperty("--headline-size",(Number(g.size)||58)+"px");
box.classList.remove("anim-fade","anim-slide-up","anim-slide-left","anim-zoom","anim-none","corner-square","corner-soft","corner-round","border-accent","border-outline","border-none");
box.classList.add("anim-"+(g.animation||"fade"),"corner-"+(g.corners||"square"),"border-"+(g.border||"accent"));
set("custom-kicker",g.kicker);set("custom-title",g.title);set("custom-subtitle",g.subtitle);set("custom-extra",g.extra);set("custom-host",g.host);set("custom-footer",g.footer);set("custom-badge",g.badge);
$("custom-badge").hidden=!g.badge;$("custom-extra").hidden=!g.extra;$("custom-host").hidden=!g.host;$("custom-footer").hidden=!g.footer;
if(autoHide)clearTimeout(autoHide);const seconds=Math.max(0,Number(g.duration)||0);if(seconds>0)autoHide=setTimeout(()=>hidden(true),seconds*1000);
}
function command(payload){if(!payload)return;if(payload.action==="hide"){if(autoHide)clearTimeout(autoHide);hidden(true);return;}if(payload.graphic){applyGraphic(payload.graphic);if(payload.action==="show"||payload.action==="preview")hidden(false);}}
function showError(message){const e=$("overlay-error");if(e){e.hidden=false;e.textContent="NETWORK DATA UNAVAILABLE · "+message;}}
function clearError(){const e=$("overlay-error");if(e)e.hidden=true;}
function connectRealtime(){const c=config();if(!window.supabase?.createClient||!c.supabaseUrl||!c.supabaseAnonKey){showError("Realtime configuration unavailable; overlay remains ready for local preview.");return;}
try{client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:10}}});
channel=client.channel("tacoma-nights-onair-graphics-v1",{config:{broadcast:{self:false}}});
channel.on("broadcast",{event:"graphics-command"},({payload})=>command(payload));
channel.subscribe(status=>{if(status==="SUBSCRIBED"){clearError();if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}}else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){showError("Graphics connection "+status.toLowerCase()+". Retrying…");if(retryTimer)clearTimeout(retryTimer);retryTimer=setTimeout(connectRealtime,5000);}});
}catch(error){showError(error.message||"Realtime connection failed.");if(retryTimer)clearTimeout(retryTimer);retryTimer=setTimeout(connectRealtime,5000);}
}
async function loadNetworkState(){const c=config();if(!c.supabaseUrl||!c.supabaseAnonKey)return;try{const url=c.supabaseUrl.replace(/\/$/,"")+"/rest/v1/live_network_public_state?select=network_name,public_status,current_program_title,current_host,description,next_program_title,next_program_starts_at,updated_at&is_published=eq.true&limit=1";const response=await fetch(url,{headers:{apikey:c.supabaseAnonKey,Authorization:"Bearer "+c.supabaseAnonKey},cache:"no-store"});if(!response.ok)throw Error("Network state HTTP "+response.status);const rows=await response.json(),s=rows[0]||{},title=s.current_program_title||"Tacoma Nights",meta=[s.current_host?"Hosted by "+s.current_host:"",s.description||"Live from Tacoma, Washington"].filter(Boolean).join(" · "),next=s.next_program_title||"Next program to be announced",when=fmt(s.next_program_starts_at);
set("current-title",title);set("current-meta",meta);set("current-kicker",String(s.public_status||"").toLowerCase()==="live"?"NOW PLAYING · LIVE":"NOW PLAYING · TACOMA NIGHTS NETWORK");set("next-title",next);set("next-time",when);set("strip-current",title);set("strip-next",next+" · "+when);set("slate-title",title);set("slate-subtitle",meta);set("slate-next-title",next);set("slate-next-time",when);const live=String(s.public_status||"").toLowerCase()==="live";$("live-indicator").textContent=live?"LIVE":"NETWORK";$("live-indicator").classList.toggle("live",live);clearError();
}catch(error){showError(error.message||"Network state could not be loaded.");}}
window.addEventListener("message",event=>{if(event.data?.type==="tacoma-graphics-command")command(event.data.payload);});
window.addEventListener("beforeunload",()=>{if(retryTimer)clearTimeout(retryTimer);if(autoHide)clearTimeout(autoHide);if(client&&channel)client.removeChannel(channel);});
setMode(mode);if(params.get("hidden")==="1")hidden(true);loadNetworkState();connectRealtime();setInterval(loadNetworkState,30000);
})();