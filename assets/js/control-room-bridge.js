/* Public-facing read bridge to the Tacoma Nights Raven Control Room.
   The Control Room writes to the shared Supabase project; this script reads only
   public-facing settings and published crew profiles under the existing RLS policies.
   No admin session, service-role key, or private Control Room HTML is exposed here. */
(() => {
  "use strict";
  const db = window.tacomaNightsSupabase;
  if (!db) return;
  const CONTROL_ROOM_URL = "https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html";
  const PLAYLIST_ID = "PLYK7RQq4_mhw";
  const PLAYLIST_URL = "https://www.youtube.com/playlist?list=" + PLAYLIST_ID;
  const PLAYLIST_EMBED = "https://www.youtube-nocookie.com/embed/videoseries?list=" + PLAYLIST_ID;
  let countdownTimer = null;
  const $ = (selector, root=document) => root.querySelector(selector);
  const setText = (selector, value) => { const el=$(selector); if(el && value != null) el.textContent=String(value); };
  const setSyncStatus = message => document.querySelectorAll("#connection-state,[data-control-room-status]").forEach(el=>el.textContent=message);
  const validVideoId = value => /^[A-Za-z0-9_-]{11}$/.test(String(value||""));
  const embedVideo = id => "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0&modestbranding=1";
  const formatPacific = value => new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(value));
  function ensureSitewideMediaPanel() {
    let panel=$("#tn-sitewide-media");
    if(panel) return panel;
    const footer=$("footer");
    const mount=footer||$("main")||document.body;
    if(!mount) return null;
    panel=document.createElement("section");
    panel.id="tn-sitewide-media";
    panel.className="tn-sitewide-media";
    panel.innerHTML='<div class="tn-sitewide-media-inner"><div><span class="tn-sitewide-kicker">TACOMA NIGHTS · OFFICIAL YOUTUBE</span><h2 data-tn-sitewide-title>Watch the latest Tacoma Nights</h2><p data-tn-sitewide-copy>Full episodes, community stories and conversations from the 253.</p><p class="tn-sitewide-status" data-tn-sitewide-status>Playlist connected</p></div><div class="tn-sitewide-actions"><a data-tn-sitewide-watch href="'+PLAYLIST_URL+'" target="_blank" rel="noopener">Watch on YouTube ↗</a><a data-tn-sitewide-control href="'+CONTROL_ROOM_URL+'" target="_blank" rel="noopener">Raven Control Room ↗</a></div></div>';
    if(footer&&footer.parentNode) footer.parentNode.insertBefore(panel,footer);
    else mount.append(panel);
    return panel;
  }
  function syncCountdown(row) {
    if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null;}
    const panel=ensureSitewideMediaPanel();
    const liveFrame=$("#tn-live-player");
    const liveTitle=$("#tn-live-title");
    const stateLabel=$("#tn-broadcast-state");
    const watchLink=$("#tn-live-watch-link");
    const chatFrame=$("#tn-live-chat-embed");
    const chatNote=$("#tn-live-chat-note");
    const placeholder=$("#tn-live-placeholder");
    const countdownPanel=$(".countdown-panel");
    const setCountdown=(message)=>{
      setText("#countdown-status",message);
      ["#count-days","#count-hours","#count-minutes","#count-seconds"].forEach(sel=>setText(sel,"00"));
    };
    const showPlaceholder=(message,state="PREMIERE SETUP")=>{
      if(liveFrame){liveFrame.hidden=true;liveFrame.src="about:blank";}
      if(placeholder){placeholder.hidden=false;const p=placeholder.querySelector("p");if(p&&message)p.textContent=message;}
      if(liveTitle)liveTitle.textContent="Premiere setup pending · past episodes are available in the archive.";
      if(stateLabel)stateLabel.textContent=state;
      if(watchLink){watchLink.href=PLAYLIST_URL;watchLink.textContent="Browse episode archive ↗";}
      if(chatFrame){chatFrame.hidden=true;chatFrame.removeAttribute("src");}
      if(chatNote)chatNote.hidden=false;
    };
    if(!row?.is_published){
      showPlaceholder("The video and live chat will appear here as soon as the YouTube Premiere is scheduled and published from Raven Control Room.");
      setCountdown("Waiting for the next published Tacoma Nights Premiere");
      return;
    }
    const title=row.show_title||"Tacoma Nights";
    const videoId=row.youtube_video_id;
    const status=String(row.status||"playlist").toLowerCase();
    const when=row.premiere_at?new Date(row.premiere_at):null;
    const hasDate=!!(when&&Number.isFinite(when.getTime()));
    const valid=validVideoId(videoId);
    const isScheduled=status==="scheduled";
    const isLive=status==="live";
    const isEnded=["ended","complete","completed","replay","archived"].includes(status);
    const activeBroadcast=valid&&(isLive||isScheduled);
    if(hasDate){
      setText("#next-episode-title",title);
      setText("#next-episode-date",formatPacific(when));
      if(isScheduled&&when.getTime()>Date.now()){
        const tick=()=>{
          const left=Math.max(0,when.getTime()-Date.now());
          const values=[Math.floor(left/86400000),Math.floor(left%86400000/3600000),Math.floor(left%3600000/60000),Math.floor(left%60000/1000)];
          ["#count-days","#count-hours","#count-minutes","#count-seconds"].forEach((sel,i)=>setText(sel,String(values[i]).padStart(2,"0")));
          if(left===0){setCountdown("Premiere time reached · YouTube will transition to the live broadcast");clearInterval(countdownTimer);countdownTimer=null;}
        };
        tick();countdownTimer=setInterval(tick,1000);
        setText("#countdown-status","Scheduled Premiere · synced from Raven Control Room");
      }else if(isLive){
        setCountdown("LIVE NOW · Tacoma Nights is on the air");
      }else if(isEnded){
        setCountdown("Premiere complete · watch the full replay");
      }else if(isScheduled){
        setCountdown("Premiere time reached · waiting for YouTube to go live");
      }else{
        setCountdown("Schedule synced from Raven Control Room");
      }
    }else if(!isLive&&!isEnded){
      setCountdown("Next episode details will appear when published in Raven Control Room");
    }
    if(!valid){
      showPlaceholder("The episode record is published, but its YouTube video ID is not ready yet. Add the scheduled Premiere video ID in Raven Control Room and this player will connect automatically.",isScheduled?"PREMIERE SCHEDULED · VIDEO PENDING":"VIDEO SETUP PENDING");
    }else{
      if(liveFrame){liveFrame.src=embedVideo(videoId);liveFrame.title=title+" · Tacoma Nights";liveFrame.hidden=false;}
      if(placeholder)placeholder.hidden=true;
      const label=isLive?"LIVE NOW":isScheduled?"UPCOMING PREMIERE":isEnded?"PERMANENT REPLAY":"LATEST VIDEO";
      if(liveTitle)liveTitle.textContent=label+" · "+title;
      if(stateLabel)stateLabel.textContent=label;
      if(watchLink){watchLink.href="https://www.youtube.com/watch?v="+encodeURIComponent(videoId);watchLink.textContent=isEnded?"Watch Permanent Replay ↗":isLive?"Watch Live on YouTube ↗":isScheduled?"Open Scheduled Premiere ↗":"Watch Episode on YouTube ↗";}
    }
    if(chatFrame&&activeBroadcast){
      chatFrame.src="https://www.youtube.com/live_chat?v="+encodeURIComponent(videoId)+"&embed_domain=crowrulesentertainment-oss.github.io";
      chatFrame.hidden=false;
      if(chatNote)chatNote.hidden=true;
    }else{
      if(chatFrame){chatFrame.hidden=true;chatFrame.removeAttribute("src");}
      if(chatNote){
        chatNote.hidden=false;
        const heading=chatNote.querySelector("h4");
        const copy=chatNote.querySelector("p");
        if(heading)heading.textContent=isEnded?"The live chat has closed.":"Chat opens with the premiere.";
        if(copy)copy.textContent=isEnded?"The broadcast has ended. Watch the permanent replay above or join the community discussion.":"YouTube chat appears here for scheduled or live broadcasts. You can also join the community discussion.";
      }
    }
    const watchUrl=valid?"https://www.youtube.com/watch?v="+encodeURIComponent(videoId):PLAYLIST_URL;
    if(panel){
      setText("[data-tn-sitewide-title]",title);
      setText("[data-tn-sitewide-copy]",hasDate?(isEnded?"Replay available · "+formatPacific(when):"Tacoma Nights broadcast · "+formatPacific(when)):"Official Tacoma Nights episodes, conversations and community stories.");
      const label=panel.querySelector("[data-tn-sitewide-status]");
      if(label)label.textContent=isLive?"LIVE NOW · Tacoma Nights":isScheduled?"UPCOMING PREMIERE · Tacoma Nights":isEnded?"PERMANENT REPLAY · Tacoma Nights":"OFFICIAL PLAYLIST · Tacoma Nights";
      const watch=panel.querySelector("[data-tn-sitewide-watch]");
      if(watch){watch.href=watchUrl;watch.textContent=isLive?"Watch Live on YouTube ↗":isScheduled?"Open Scheduled Premiere ↗":isEnded?"Watch Permanent Replay ↗":valid?"Watch Tacoma Nights Video ↗":"Watch on YouTube ↗";}
    }
    document.querySelectorAll("[data-tn-premiere-link]").forEach(a=>{a.href=watchUrl;a.hidden=!valid;});
  }
  function syncFeaturedVideo(value) {
    const videoId=value?.video_id;
    const frame=$(".feature iframe, [data-tn-featured-player]");
    const title=$("[data-tn-featured-title]") || $(".feature h3");
    const description=$("[data-tn-featured-description]") || $(".feature p");
    const link=$("[data-tn-featured-link]");
    if(!validVideoId(videoId)){
      if(frame){delete frame.dataset.tnApprovedFeatured;frame.src=PLAYLIST_EMBED;frame.title="Official Tacoma Nights playlist";}
      if(title) title.textContent="Stories. People. Community.";
      if(description) description.textContent="Full episodes, conversations, community features and special programming from Tacoma Nights.";
      if(link){link.href=PLAYLIST_URL;link.textContent="Open Tacoma Nights Playlist ↗";}
      return;
    }
    if(frame){
      frame.dataset.tnApprovedFeatured="true";
      frame.src=embedVideo(videoId);
      frame.title=value.title||"Tacoma Nights featured video";
    }
    if(title && value.title) title.textContent=value.title;
    if(description && value.description) description.textContent=value.description;
    if(link){link.href="https://www.youtube.com/watch?v="+encodeURIComponent(videoId);link.textContent="Watch Featured Tacoma Nights Video ↗";}
  }
  function syncWeeklyQuestion(value) {
    if(!value?.question) return;
    setText("[data-tn-weekly-label]",value.label||"The weekly question");
    setText("[data-tn-weekly-question]",value.question);
    const deadline=$("[data-tn-weekly-deadline]");
    if(deadline){deadline.textContent=value.deadline?"Responses requested by "+value.deadline:"";deadline.hidden=!value.deadline;}
    const hiddenSubject=$('input[name="subject"]');
    if(hiddenSubject && document.querySelector('input[name="submission_type"]')?.value==="episode_question") hiddenSubject.value=(value.label||"Weekly Question")+": "+value.question;
  }
  function syncCrew(rows) {
    const host=$("#control-room-crew");
    if(!host) return;
    const people=(rows||[]).filter(p=>p.is_published);
    if(!people.length){host.hidden=true;return;}
    host.hidden=false;
    const grid=document.createElement("div");grid.className="grid";
    people.forEach(person=>{
      const card=document.createElement("article");card.className="card";
      if(person.avatar_url){const img=document.createElement("img");img.src=person.avatar_url;img.alt="";img.loading="lazy";img.style.cssText="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:12px";card.append(img);}
      const role=document.createElement("span");role.className="eyebrow";role.textContent=person.role_title||"Tacoma Nights contributor";
      const name=document.createElement("h3");name.textContent=person.display_name||"Tacoma Nights Team";
      const bio=document.createElement("p");bio.textContent=person.bio||"";
      card.append(role,name,bio);grid.append(card);
    });
    host.replaceChildren(grid);
  }
  const style=document.createElement("style");
  style.textContent=".tn-sitewide-media{background:linear-gradient(120deg,#171a20,#0d0f14);border-top:1px solid #ffffff20;border-bottom:1px solid #ffffff20;padding:30px 20px;color:#f5f1e9}.tn-sitewide-media-inner{width:min(1180px,100%);margin:auto;display:flex;align-items:center;justify-content:space-between;gap:22px}.tn-sitewide-kicker{font-size:.65rem;letter-spacing:.16em;font-weight:800;color:#d8b875}.tn-sitewide-media h2{font-size:clamp(1.35rem,3vw,2rem);margin:7px 0}.tn-sitewide-media p{margin:0;color:#b9b6b0;font-size:.88rem}.tn-sitewide-media .tn-sitewide-status{margin-top:8px;color:#d8b875;font-size:.68rem;font-weight:800;letter-spacing:.1em}.tn-sitewide-actions{display:flex;flex-wrap:wrap;gap:9px}.tn-sitewide-actions a{display:inline-flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid #d8b875;color:#f5f1e9;text-decoration:none;font-size:.72rem;font-weight:800;letter-spacing:.06em}.tn-sitewide-actions a:first-child{background:#d8b875;color:#151515}@media(max-width:650px){.tn-sitewide-media-inner{align-items:flex-start;flex-direction:column}.tn-sitewide-actions{width:100%}.tn-sitewide-actions a{flex:1}}";
  document.head.appendChild(style);
  async function run() {
    ensureSitewideMediaPanel();
    setSyncStatus("Connecting to Raven Control Room…");
    const jobs=[
      db.from("tacoma_nights_show_settings").select("show_title,premiere_at,status,is_published,youtube_video_id").eq("setting_key","premiere").eq("is_published",true).maybeSingle(),
      db.from("tacoma_nights_featured_video").select("setting_value").eq("setting_key","featured_video").maybeSingle(),
      db.from("tacoma_nights_site_settings").select("setting_value").eq("setting_key","weekly_question").maybeSingle(),
      db.from("tacoma_nights_crew").select("display_name,role_title,bio,avatar_url,is_published,is_featured,sort_order").eq("is_published",true).order("sort_order",{ascending:true}).limit(30)
    ];
    const [premiere,featured,question,crew]=await Promise.allSettled(jobs);
    let successful=0;
    if(premiere.status==="fulfilled"&&!premiere.value.error){syncCountdown(premiere.value.data);successful++;}
    else if(premiere.status==="rejected"||premiere.value?.error)console.warn("Control Room premiere sync unavailable",premiere.reason||premiere.value.error);
    if(featured.status==="fulfilled"&&!featured.value.error){syncFeaturedVideo(featured.value.data?.setting_value||{});successful++;}
    else if(featured.status==="rejected"||featured.value?.error)console.warn("Control Room featured video sync unavailable",featured.reason||featured.value.error);
    if(question.status==="fulfilled"&&!question.value.error){syncWeeklyQuestion(question.value.data?.setting_value||{});successful++;}
    else if(question.status==="rejected"||question.value?.error)console.warn("Control Room weekly question sync unavailable",question.reason||question.value.error);
    if(crew.status==="fulfilled"&&!crew.value.error){syncCrew(crew.value.data||[]);successful++;}
    else if(crew.status==="rejected"||crew.value?.error)console.warn("Control Room crew sync unavailable",crew.reason||crew.value.error);
    setSyncStatus(successful ? "Connected · YouTube + Raven Control Room synced" : "YouTube playlist connected · Control Room content will use site defaults");
    document.querySelectorAll("[data-control-room-link]").forEach(a=>{a.href=CONTROL_ROOM_URL;a.target="_blank";a.rel="noopener";});
    window.dispatchEvent(new CustomEvent("tacoma-nights-control-room-synced",{detail:{successful}}));
  }
  window.TacomaNightsControlRoom={url:CONTROL_ROOM_URL,refresh:run};
  let refreshQueued=false;
  const refreshWhenVisible=()=>{
    if(document.visibilityState==="hidden"||refreshQueued)return;
    refreshQueued=true;
    run().catch(error=>console.warn("Raven Control Room refresh failed:",error)).finally(()=>{refreshQueued=false;});
  };
  window.addEventListener("focus",refreshWhenVisible);
  document.addEventListener("visibilitychange",refreshWhenVisible);
  window.setInterval(()=>{if(document.visibilityState==="visible")refreshWhenVisible();},300000);
  run().catch(error=>{console.warn("Raven Control Room public sync failed:",error);setSyncStatus("Control Room sync unavailable · official Tacoma Nights playlist remains available");});
})();
