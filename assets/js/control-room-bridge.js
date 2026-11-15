/* Public-facing read bridge to the Tacoma Nights Raven Control Room.
   The Control Room writes to the shared Supabase project; this script reads only
   public-facing settings and published crew profiles under the existing RLS policies.
   No admin session, service-role key, or private Control Room HTML is exposed here. */
(() => {
  "use strict";
  const db = window.tacomaNightsSupabase;
  if (!db) return;
  const CONTROL_ROOM_URL = "https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html";
  const PLAYLIST_ID = "PLKfh6Jm08P-c";
  const $ = (selector, root=document) => root.querySelector(selector);
  const setText = (selector, value) => { const el=$(selector); if(el && value != null) el.textContent=String(value); };
  const setSyncStatus = message => document.querySelectorAll("#connection-state,[data-control-room-status]").forEach(el=>el.textContent=message);
  const validVideoId = value => /^[A-Za-z0-9_-]{11}$/.test(String(value||""));
  const embedVideo = id => "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0&modestbranding=1";
  const formatPacific = value => new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(value));
  function syncCountdown(row) {
    if (!row?.premiere_at || !row.is_published) return;
    const when = new Date(row.premiere_at);
    if (!Number.isFinite(when.getTime())) return;
    setText("#next-episode-title", row.show_title || "The next conversation is coming.");
    setText("#next-episode-date", formatPacific(when));
    let timer;
    const tick=()=>{
      const left=Math.max(0,when.getTime()-Date.now());
      const values=[Math.floor(left/86400000),Math.floor(left%86400000/3600000),Math.floor(left%3600000/60000),Math.floor(left%60000/1000)];
      ["#count-days","#count-hours","#count-minutes","#count-seconds"].forEach((sel,i)=>setText(sel,String(values[i]).padStart(2,"0")));
      if(left===0){setText("#countdown-status","Premiere time reached · watch Tacoma Nights");clearInterval(timer);}
    };
    tick(); timer=setInterval(tick,1000);
    setText("#countdown-status","Schedule synced from Raven Control Room");
  }
  function syncFeaturedVideo(value) {
    const videoId=value?.video_id;
    if(!validVideoId(videoId)) return;
    const frame=$(".feature iframe, [data-tn-featured-player]");
    if(frame){
      frame.dataset.tnApprovedFeatured="true";
      frame.src=embedVideo(videoId);
      frame.title=value.title||"Tacoma Nights featured video";
    }
    const title=$("[data-tn-featured-title]") || $(".feature h3");
    if(title && value.title) title.textContent=value.title;
    const description=$("[data-tn-featured-description]") || $(".feature p");
    if(description && value.description) description.textContent=value.description;
    const link=$("[data-tn-featured-link]");
    if(link){link.href="https://www.youtube.com/watch?v="+encodeURIComponent(videoId);link.textContent="Watch Featured Tacoma Nights Video ↗";}
  }
  function syncWeeklyQuestion(value) {
    if(!value?.question) return;
    setText("[data-tn-weekly-label]",value.label||"The weekly question");
    setText("[data-tn-weekly-question]",value.question);
    const deadline=$("[data-tn-weekly-deadline]");
    if(deadline){deadline.textContent=value.deadline?"Responses requested by "+value.deadline:"";deadline.hidden=!value.deadline;}
    const hiddenSubject=$('input[name="subject"]');
    if(hiddenSubject && hiddenSubject.value.startsWith("Weekly Question:")) hiddenSubject.value=(value.label||"Weekly Question")+": "+value.question;
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
  async function run() {
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
    setSyncStatus(successful ? "Connected · content synced from Raven Control Room" : "Raven Control Room connected · public content will use site defaults");
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
  run().catch(error=>{console.warn("Raven Control Room public sync failed:",error);setSyncStatus("Control Room sync unavailable · showing Tacoma Nights defaults");});
