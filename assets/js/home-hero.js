(()=> {
"use strict";
const root=document.querySelector("[data-hero-carousel]");if(!root)return;
const slides=[...root.querySelectorAll("[data-hero-slide]")],dots=[...root.querySelectorAll("[data-hero-dot]")],pause=root.querySelector("[data-hero-pause]");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let index=0,timer=null,paused=reduced,player=null,ytReady=false,playerReady=false,videoId="XTSDHNf2DAA",currentLoadedVideoId="",videoRequested=false,videoActive=true;
const stop=()=>{if(timer)clearTimeout(timer);timer=null;};
const stopVideo=()=>{try{if(player&&player.stopVideo)player.stopVideo()}catch{}};
const start=()=>{stop();if(!paused&&!document.hidden&&index!==2)timer=setTimeout(()=>show(index+1),8000);};
const loadApi=()=>{
 if(window.YT&&window.YT.Player){ytReady=true;createPlayer();return}
 if(window.__tnHeroYTLoading)return;
 window.__tnHeroYTLoading=true;
 const previous=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{if(typeof previous==="function")previous();ytReady=true;createPlayer()};
 const script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";document.head.appendChild(script);
};
const createPlayer=()=>{
 if(player||!ytReady)return;
 const host=document.getElementById("tnHeroVideoPlayer");if(!host)return;
 player=new YT.Player(host,{videoId,playerVars:{autoplay:0,controls:1,rel:0,playsinline:1,enablejsapi:1,origin:location.origin},events:{
  onReady:()=>{playerReady=true;if(index===2)playFeature()},
  onStateChange:event=>{if(event.data===YT.PlayerState.ENDED&&index===2){stopVideo();show(0);start()}},
  onError:()=>{const note=root.querySelector("[data-hero-video-status]");if(note)note.textContent="The featured video could not be played. Open CrowRules Entertainment on YouTube.";}
 }});
};
const playFeature=()=>{
 stop();if(paused||document.hidden)return;
 if(!videoRequested){videoRequested=true;loadApi();return}
 if(playerReady){try{player.mute();if(currentLoadedVideoId!==videoId){currentLoadedVideoId=videoId;player.loadVideoById(videoId)}else player.playVideo()}catch{}}
};
const show=next=>{
 const old=index;index=(next+slides.length)%slides.length;if(index===2&&!videoActive)index=0;
 slides.forEach((el,i)=>{const active=i===index;el.classList.toggle("is-active",active);el.classList.toggle("is-hidden",!active&&i===0);el.setAttribute("aria-hidden",String(!active))});
 root.classList.toggle("is-second-active",index===1);root.classList.toggle("is-video-active",index===2);
 dots.forEach((el,i)=>el.setAttribute("aria-current",String(i===index)));
 if(old===2&&index!==2)stopVideo();
 if(index===2)playFeature();else start();
};
root.querySelector("[data-hero-prev]")?.addEventListener("click",()=>show(index-1));
root.querySelector("[data-hero-next]")?.addEventListener("click",()=>show(index+1));
dots.forEach((el,i)=>el.addEventListener("click",()=>show(i)));
pause?.addEventListener("click",()=>{paused=!paused;pause.textContent=paused?"PLAY":"PAUSE";pause.setAttribute("aria-pressed",String(paused));if(paused){stop();if(index===2)stopVideo()}else if(index===2)playFeature();else start()});
root.addEventListener("mouseenter",()=>{if(index!==2)stop()});root.addEventListener("mouseleave",()=>{if(index!==2)start()});
root.addEventListener("focusin",()=>{if(index!==2)stop()});root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget)&&index!==2)start()});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stop();if(index===2)stopVideo()}else if(index===2)playFeature();else start()});
show(0);if(pause){pause.textContent=paused?"PLAY":"PAUSE";pause.setAttribute("aria-pressed",String(paused))}start();
const cfg=window.TACOMA_NIGHTS_CONFIG||{},db=window.__tnSupabaseClient;
if(db){db.from("tn_homepage_hero_video").select("youtube_video_id,title,description").eq("id",1).maybeSingle().then(({data,error})=>{if(error){console.warn("Hero video setting unavailable",error);return}if(data){videoActive=!!data.is_active;const feature=slides[2],dot=dots[2];if(feature)feature.hidden=!videoActive;if(dot)dot.hidden=!videoActive;if(!videoActive&&index===2)show(0);if(/^[A-Za-z0-9_-]{11}$/.test(data.youtube_video_id||""))videoId=data.youtube_video_id;if(data.title){const heading=root.querySelector('[data-hero-slide="2"] h2');if(heading){heading.textContent=data.title;heading.setAttribute("aria-label",data.title)}}if(data.description){const copy=root.querySelector('[data-hero-slide="2"] .tn2-hero-copy');if(copy)copy.textContent=data.description}if(player&&playerReady&&player.loadVideoById){currentLoadedVideoId=videoId;player.loadVideoById(videoId)}}).catch(e=>console.warn("Hero video setting unavailable",e))}
if(cfg.youtubeStatsEndpoint){
 root.querySelectorAll("[data-subscriber-caption]").forEach(el=>el.textContent="Connecting to YouTube…");
 const loadStats=async()=>{const response=await fetch(cfg.youtubeStatsEndpoint,{cache:"no-store"});if(!response.ok)throw new Error("Subscriber stats unavailable");const data=await response.json(),entries={tv:data.channels?.crowrules_tv,entertainment:data.channels?.crowrules_entertainment};Object.entries(entries).forEach(([key,item])=>{if(!item||item.subscriberCount===null||!Number.isFinite(Number(item.subscriberCount)))return;const card=root.querySelector('[data-subscriber-card="'+key+'"]');if(!card)return;const count=Math.max(0,Number(item.subscriberCount)),goal=Number(item.goal)||1000,pct=Math.min(100,count/goal*100);card.querySelector("[data-subscriber-count]").textContent=Math.floor(count).toLocaleString();card.querySelector("[data-subscriber-caption]").textContent=count>=goal?"Goal reached · thank you!":(goal-Math.floor(count)).toLocaleString()+" subscribers to go · YouTube public count";const bar=card.querySelector(".tn2-progress");if(bar){bar.setAttribute("aria-valuenow",String(Math.min(goal,Math.floor(count))));bar.setAttribute("aria-valuetext",Math.floor(count).toLocaleString()+" of "+goal+" subscribers");const fill=bar.querySelector("span");if(fill)fill.style.width=pct+"%";bar.classList.toggle("tn2-progress-empty",count===0)}})};
 const refresh=()=>loadStats().catch(()=>root.querySelectorAll("[data-subscriber-caption]").forEach(el=>{if(el.textContent==="Connecting to YouTube…")el.textContent="Subscriber count temporarily unavailable"}));refresh();window.setInterval(refresh,300000);
}
})();