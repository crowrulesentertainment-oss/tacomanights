(()=>{"use strict";
const c=window.TACOMA_NIGHTS_CONFIG||{},$=id=>document.getElementById(id);
const channelFallback=c.youtubeChannelId||"UCOSm_4z9LIQUWHOc8yzPgkw";
const channelUrl="https://www.youtube.com/@CrowRules_TV/live";
let lastPlayerUrl="",refreshTimer=null,loading=false;
function extractVideoId(value){
 if(!value)return"";
 const raw=String(value).trim();
 if(/^[a-zA-Z0-9_-]{11}$/.test(raw))return raw;
 try{
  const u=new URL(raw);
  if(u.hostname.includes("youtu.be"))return u.pathname.split("/").filter(Boolean)[0]||"";
  if(u.pathname.includes("/live/")||u.pathname.includes("/shorts/")||u.pathname.includes("/embed/"))return u.pathname.split("/").filter(Boolean).pop()||"";
  return u.searchParams.get("v")||"";
 }catch{return""}
}
function setText(id,value){const n=$(id);if(n)n.textContent=value}
function buildPlayerUrl(state){
 const id=extractVideoId(state?.youtube_video_id||c.youtubeLiveVideoId||"");
 const params=new URLSearchParams({autoplay:"0",playsinline:"1",rel:"0",controls:"1",iv_load_policy:"3",origin:location.origin});
 if(id)return"https://www.youtube.com/embed/"+encodeURIComponent(id)+"?"+params.toString();
 return"https://www.youtube.com/embed/live_stream?channel="+encodeURIComponent(state?.youtube_channel_id||channelFallback)+"&"+params.toString();
}
function updatePlayer(state){
 const url=buildPlayerUrl(state),frame=$("network-player");
 if(frame&&(url!==lastPlayerUrl||frame.dataset.playerUrl!==url)){
  frame.src=url;frame.dataset.playerUrl=url;frame.title="Tacoma Nights Network live broadcast on YouTube";
 }
 lastPlayerUrl=url;
 const status=String(state?.public_status||"").toLowerCase();
 const live=status==="live";
 setText("network-player-status",live?"● NETWORK BROADCAST LIVE":status==="offline"?"NETWORK OFFLINE · CHANNEL PLAYER READY":"CHANNEL PLAYER READY");
 setText("current-program",state?.current_program_title||"Tacoma Nights Network");
 setText("current-description",[state?.current_host?"Hosted by "+state.current_host:"",state?.description||""].filter(Boolean).join(" · ")||"Live from Tacoma, Washington.");
 setText("network-player-note",state?.youtube_video_id?"Playing the broadcast selected by Tacoma Nights Master Control.":"Following the CrowRules TV channel's current live stream. If no broadcast is active, the player will show the channel's offline screen.");
 const link=$("youtube-watch-link");
 if(link)link.href=state?.youtube_video_id?"https://www.youtube.com/watch?v="+encodeURIComponent(extractVideoId(state.youtube_video_id)):channelUrl;
}
async function load(){
 if(loading)return;loading=true;
 let state=null;
 try{
  if(c.supabaseUrl&&c.supabaseAnonKey){
   const base=c.supabaseUrl.replace(/\/$/,"");
   const endpoint=base+"/rest/v1/live_network_public_state?select=network_name,public_status,youtube_video_id,youtube_channel_id,current_program_title,current_host,description,next_program_title,next_program_starts_at&is_published=eq.true&limit=1";
   const response=await fetch(endpoint,{headers:{apikey:c.supabaseAnonKey,Authorization:"Bearer "+c.supabaseAnonKey},cache:"no-store"});
   if(response.ok){const rows=await response.json();state=rows[0]||null;}
   else console.warn("Network status request failed:",response.status);
  }
 }catch(error){console.warn("Public network state unavailable; using channel live fallback.",error);}
 updatePlayer(state);
 if(!state)setText("network-player-status","CHANNEL PLAYER READY");
 loading=false;
}
function start(){
 const refresh=$("refresh-network-player");
 if(refresh)refresh.addEventListener("click",()=>{lastPlayerUrl="";load()});
 const link=$("youtube-watch-link");if(link)link.href=channelUrl;
 load();
 if(refreshTimer)clearInterval(refreshTimer);
 refreshTimer=setInterval(load,60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)load()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();