(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const header=$("#site-header"),clock=document.createElement("div");
clock.className="hq-clock";clock.setAttribute("aria-live","off");
function tick(){const d=new Date();clock.innerHTML='<span>PRODUCTION · PACIFIC</span><b>'+new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"numeric",minute:"2-digit"}).format(d)+'</b><small>'+new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"short",month:"short",day:"numeric"}).format(d)+'</small>'}
if(header){header.append(clock);tick();setInterval(tick,30000)}
function openTab(name){const tab=$('.ph-tab[data-tab="'+name+'"]');if(!tab||tab.classList.contains("hidden"))return;tab.click();const target=$("#view-"+name);if(target){target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});}}
const weekSelect=$("#hqWeekSelect"),weekContext=$("#hqWeekContext");
function syncWeekOptions(){
 if(!weekSelect)return;
 const source=$("#uploadEpisode");if(!source||source.options.length<2)return;
 const previous=weekSelect.value;
 weekSelect.innerHTML='<option value="">Choose a weekly episode…</option>'+[...source.options].slice(1).map(o=>'<option value="'+o.value+'">'+o.textContent+'</option>').join("");
 if(previous&&[...weekSelect.options].some(o=>o.value===previous))weekSelect.value=previous;
 else if(source.options[1])weekSelect.value=source.options[1].value;
 updateWeekContext();
}
function filterWeeklyLists(){
 const option=weekSelect?.selectedOptions?.[0],label=option?.textContent?.trim();
 ["assignmentList","uploadList","adminUploads"].forEach(id=>{
  const host=$("#"+id);if(!host)return;
  [...host.children].forEach(card=>{card.hidden=!!(label&&option.value)&&!(card.textContent||"").includes(label.split(" · ")[0]);});
 });
}
function updateWeekContext(){
 const option=weekSelect?.selectedOptions?.[0];if(weekContext)weekContext.textContent=option&&option.value?"Selected production: "+option.textContent+" · Lists and new submissions are scoped to this episode.":"Choose an episode to open its production workspace.";
 filterWeeklyLists();
}
function applyWeek(){
 const id=weekSelect?.value;if(!id)return false;
 ["uploadEpisode","assignmentEpisode","h3StudioEpisode"].forEach(key=>{const el=$("#"+key);if(el&&[...el.options].some(o=>o.value===id))el.value=id;});
 updateWeekContext();return true;
}
weekSelect?.addEventListener("change",applyWeek);
$("[data-hq-open]").forEach(button=>button.addEventListener("click",()=>{
 const action=button.dataset.hqOpen;
 if(!applyWeek()){if(weekContext)weekContext.textContent="Create or load an episode first, then choose its week here.";openTab("episodes");return;}
 openTab(action);
}));
const episodeList=$("#episodeList");
if(episodeList)new MutationObserver(syncWeekOptions).observe(episodeList,{childList:true,subtree:true});
const uploadEpisode=$("#uploadEpisode");
if(uploadEpisode)new MutationObserver(syncWeekOptions).observe(uploadEpisode,{childList:true});
syncWeekOptions();
const app=$("#appPanel"),welcome=$("#hqMemberWelcome"),member=$("#memberName"),role=$("#memberRole");
function syncAccess(){const signedIn=app&&!app.classList.contains("hidden");if(!signedIn)return;const name=member?.textContent?.trim()||"TEAM MEMBER";if(welcome)welcome.textContent=name.toUpperCase();const producer=["admin","producer"].includes((role?.textContent||"").trim().toLowerCase());$$(".hq-producer-only").forEach(el=>el.classList.toggle("hidden",!producer));}
if(app){new MutationObserver(syncAccess).observe(app,{attributes:true,attributeFilter:["class"]});const observer=new MutationObserver(syncAccess);if(member)observer.observe(member,{childList:true,characterData:true,subtree:true});if(role)observer.observe(role,{childList:true,characterData:true,subtree:true});syncAccess();}
const tabs=$$(".ph-tab");tabs.forEach(b=>{b.addEventListener("click",()=>{tabs.forEach(t=>t.setAttribute("aria-selected",String(t===b)));});});
const form=$("#uploadForm");if(form){form.classList.add("hq-upload-drop");const input=form.querySelector('input[type="file"]');if(input){input.setAttribute("aria-describedby","uploadDropHint");input.setAttribute("aria-label","Choose segment recording files");}}
const notice=$("#connectionNotice");if(notice){const observer=new MutationObserver(()=>notice.classList.toggle("is-error",/error|failed|could not|denied/i.test(notice.textContent||"")));observer.observe(notice,{childList:true,subtree:true,characterData:true});}
const hero=$(".ph-hero");if(hero){const wrap=hero.querySelector(".ph-wrap");if(wrap&&!wrap.querySelector(".hq-scroll-cue")){const a=document.createElement("a");a.className="hq-scroll-cue";a.href="#workspace";a.textContent="ENTER THE TEAM WORKSPACE ↓";a.style.cssText="display:inline-block;margin-top:24px;color:#e5c797;font-size:10px;font-weight:800;letter-spacing:.16em;text-decoration:none";wrap.append(a);}}
})();