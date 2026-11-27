(()=>{
"use strict";
const root=document.querySelector("[data-hero-carousel]");if(!root)return;
const slides=[...root.querySelectorAll("[data-hero-slide]")],dots=[...root.querySelectorAll("[data-hero-dot]")],pause=root.querySelector("[data-hero-pause]");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let index=0,timer=null,paused=reduced;
const stop=()=>{if(timer)clearTimeout(timer);timer=null;};
const start=()=>{stop();if(!paused&&!document.hidden)timer=setTimeout(()=>show(index+1),5000);};
const show=next=>{
 index=(next+slides.length)%slides.length;
 slides.forEach((el,i)=>{const active=i===index;el.classList.toggle("is-active",active);el.classList.toggle("is-hidden",!active&&i===0);el.setAttribute("aria-hidden",String(!active))});
 root.classList.remove("is-second-active","is-video-active");
 dots.forEach((el,i)=>el.setAttribute("aria-current",String(i===index)));
 start();
};
root.querySelector("[data-hero-prev]")?.addEventListener("click",()=>show(index-1));
root.querySelector("[data-hero-next]")?.addEventListener("click",()=>show(index+1));
dots.forEach((el,i)=>el.addEventListener("click",()=>show(i)));
pause?.addEventListener("click",()=>{paused=!paused;pause.textContent=paused?"PLAY":"PAUSE";pause.setAttribute("aria-pressed",String(paused));if(paused)stop();else start()});
root.addEventListener("mouseenter",stop);root.addEventListener("mouseleave",start);
root.addEventListener("focusin",stop);root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget))start()});
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();else start()});
show(0);if(pause){pause.textContent=paused?"PLAY":"PAUSE";pause.setAttribute("aria-pressed",String(paused))}start();
const cfg=window.TACOMA_NIGHTS_CONFIG||{},db=window.__tnSupabaseClient;
if(cfg.youtubeStatsEndpoint){
 root.querySelectorAll("[data-subscriber-caption]").forEach(el=>el.textContent="Connecting to YouTube…");
 const loadStats=async()=>{const response=await fetch(cfg.youtubeStatsEndpoint,{cache:"no-store"});if(!response.ok)throw new Error("Subscriber stats unavailable");const data=await response.json(),entries={tv:data.channels?.crowrules_tv,entertainment:data.channels?.crowrules_entertainment};Object.entries(entries).forEach(([key,item])=>{if(!item||item.subscriberCount===null||!Number.isFinite(Number(item.subscriberCount)))return;const card=root.querySelector('[data-subscriber-card="'+key+'"]');if(!card)return;const count=Math.max(0,Number(item.subscriberCount)),goal=Number(item.goal)||1000,pct=Math.min(100,count/goal*100);card.querySelector("[data-subscriber-count]").textContent=Math.floor(count).toLocaleString();card.querySelector("[data-subscriber-caption]").textContent=count>=goal?"Goal reached · thank you!":(goal-Math.floor(count)).toLocaleString()+" subscribers to go · YouTube public count";const bar=card.querySelector(".tn2-progress");if(bar){bar.setAttribute("aria-valuenow",String(Math.min(goal,Math.floor(count))));bar.setAttribute("aria-valuetext",Math.floor(count).toLocaleString()+" of "+goal+" subscribers");const fill=bar.querySelector("span");if(fill)fill.style.width=pct+"%";bar.classList.toggle("tn2-progress-empty",count===0)}})};
 const refresh=()=>loadStats().catch(()=>root.querySelectorAll("[data-subscriber-caption]").forEach(el=>{if(el.textContent==="Connecting to YouTube…")el.textContent="Subscriber count temporarily unavailable"}));refresh();window.setInterval(refresh,300000);
}
if(db){
 const countEl=root.querySelector("[data-remote-host-count]");
 const refreshRemoteHostCount=async()=>{
  if(!countEl)return;
  try{const{data,error}=await db.rpc("tn_public_remote_host_count");if(error)throw error;const count=Number(data);if(!Number.isFinite(count)||count<0)throw new Error("Invalid remote host count");countEl.textContent=Math.floor(count).toLocaleString();countEl.setAttribute("aria-label",Math.floor(count)+" active remote hosts")}
  catch(error){console.warn("Remote host count unavailable",error);if(countEl&&countEl.textContent==="0")countEl.textContent="—"}
 };
 refreshRemoteHostCount();window.setInterval(refreshRemoteHostCount,15000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshRemoteHostCount()});
}
})();