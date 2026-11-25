(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const when=v=>{if(!v)return"Not scheduled";const d=new Date(v);return Number.isNaN(d.getTime())?"Date unavailable":d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})};
const safeHttps=value=>{if(!value)return"";try{const u=new URL(String(value));return u.protocol==="https:"?u.href:""}catch{return""}};
const root=document.body.dataset.root||"../";
let db,user,profile,isAdmin=false,episodes=[],members=[],notificationRows=[],notificationFilter='all';
const set=(id,html)=>{const el=$("#"+id);if(el)el.innerHTML=html};
const status=v=>'<span class="pill">'+esc(String(v||"pending").replaceAll("_"," "))+'</span>';
const notice=(form,msg)=>{const el=form?.querySelector(".hub3-status");if(el)el.textContent=msg};
const formData=form=>Object.fromEntries(new FormData(form).entries());
async function rows(table,query){const {data,error}=await query;if(error)throw error;return data||[]}
async function count(table,filters=[]){let q=db.from(table).select("id",{count:"exact",head:true});for(const [k,v] of filters)q=q.eq(k,v);const {count,error}=await q;if(error)throw error;return count||0}
function tab(name){document.querySelectorAll(".hub3-tab").forEach(b=>b.classList.toggle("active",b.dataset.h3Tab===name));document.querySelectorAll(".hub3-view").forEach(v=>v.classList.toggle("active",v.id==="hub3-"+name))}
function options(list,empty=""){return (empty?'<option value="">'+esc(empty)+'</option>':"")+list.map(x=>'<option value="'+esc(x.id)+'">'+esc((x.episode_number?x.episode_number+" · ":"")+(x.title||x.display_name||""))+'</option>').join("")}
async function refresh(){
 const baseTargets=["h3EditingEpisode","h3ResearchEpisode","h3GuestEpisode","h3RecognitionEpisode","h3RecognitionMember"];
 try{await loadBase()}catch(error){console.error("Production Hub base data",error);baseTargets.forEach(id=>{const el=$("#"+id);if(el)el.innerHTML='<option value="">Could not load options — use Refresh to retry</option>'})}
 const tasks=[["Command center",["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"],loadCommand],["Contributor workspace",["h3ContributorStats","h3ContributorNext","h3MyAssignments","h3MyUploads","h3ContributorUpdates"],loadContributor],["Editing room",["h3EditingStats","h3EditingList"],loadEditing],["Production calendar",["h3CalendarList"],loadCalendar],["Research desk",["h3ResearchList"],loadResearch],["Notifications",["h3NotificationList"],loadNotifications],["Guest bookings",["h3GuestList"],loadGuests],["Communication center",["h3ChatMessages","h3Announcements"],loadChat],["Training center",["h3TrainingList"],loadTraining],["Production analytics",["h3AnalyticsStats","h3AnalyticsBreakdown"],loadAnalytics],["Audience feedback",["h3FeedbackList"],loadFeedback],["Crew recognition",["h3RecognitionList"],loadRecognition],["Recent activity",["h3ActivityFeed"],loadActivity],["Producer review desk",["h3ReviewQueue"],loadReviewDesk]];
 await Promise.all(tasks.map(async([label,targets,fn])=>{try{await fn()}catch(error){console.error(label,error);const html='<p class="hub3-empty">Could not load '+label.toLowerCase()+': '+esc(error?.message||"Please try again.")+'</p>';targets.forEach(id=>set(id,html))}}));
}
async function loadBase(){
 episodes=await rows("tn_production_episodes",db.from("tn_production_episodes").select("id,episode_number,title,topic,premiere_at,status").order("premiere_at",{ascending:true}));
 $("#h3EditingEpisode").innerHTML=options(episodes,"Choose episode…");$("#h3ResearchEpisode").innerHTML=options(episodes,"General research / idea vault");$("#h3GuestEpisode").innerHTML=options(episodes,"Not assigned yet");$("#h3RecognitionEpisode").innerHTML=options(episodes,"General contribution");
 if(isAdmin){members=await rows("tn_production_profiles",db.from("tn_production_profiles").select("id,display_name,email,role").in("role",["contributor","producer","admin"]).order("display_name"));$("#h3RecognitionMember").innerHTML=members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+'</option>').join("");const editor=$("#h3EditingEditor");if(editor)editor.innerHTML='<option value="">Assign to me</option>'+members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+' · '+esc(m.role)+'</option>').join("")}
 document.querySelectorAll(".hub3-form button.admin-only").forEach(b=>b.classList.toggle("hidden",!isAdmin));document.querySelectorAll(".hub3-form[data-admin-only]").forEach(form=>form.classList.toggle("hidden",!isAdmin));document.querySelectorAll("[data-h3-admin-only]").forEach(el=>el.classList.toggle("hidden",!isAdmin));
}
async function loadCommand(){
 const [assignmentRows,uploadRows,editRows,researchRows]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,status,due_at").order("due_at").limit(200)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,created_at,producer_note").order("created_at",{ascending:false}).limit(200)),
  rows("tn_production_editing",db.from("tn_production_editing").select("id,status").limit(200)),
  rows("tn_production_research",db.from("tn_production_research").select("id,status").limit(200))
 ]);
 const activeEpisodes=episodes.filter(e=>!["published","archived","cancelled"].includes(String(e.status||"").toLowerCase()));
 const activeAssignments=assignmentRows.filter(a=>!["complete","completed","cancelled"].includes(String(a.status||"").toLowerCase()));
 const waitingUploads=uploadRows.filter(a=>["submitted","revision","revision_requested","pending_review"].includes(String(a.status||"").toLowerCase()));
 const reviewEdits=editRows.filter(a=>["review","producer_review","revisions"].includes(String(a.status||"").toLowerCase()));
 const readyResearch=researchRows.filter(a=>["ready","approved","complete","completed"].includes(String(a.status||"").toLowerCase()));
 set("h3CommandStats",[['Active episodes',activeEpisodes.length],['Open assignments',activeAssignments.length],['Uploads to review',waitingUploads.length],['Edits needing review',reviewEdits.length],['Research ready',readyResearch.length]].map(([l,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+l+'</span></div>').join(""));
 const upcoming=activeEpisodes.slice(0,6);
 set("h3EpisodeCommand",upcoming.map(e=>'<article class="hub3-row"><div><b>'+esc(e.episode_number)+' · '+esc(e.title)+'</b><p>'+esc(e.topic||"Topic to be confirmed")+'</p><small>Premiere: '+when(e.premiere_at)+'</small></div>'+status(e.status)+'</article>').join("")||'<p class="hub3-empty">No active episodes yet. Create an episode in the Episodes workspace below.</p>');
 const now=Date.now();
 const overdue=activeAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()<now);
 const upcomingAssignments=activeAssignments.filter(a=>!a.due_at||new Date(a.due_at).getTime()>=now).slice(0,8);
 set("h3Timeline",upcomingAssignments.map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b><small>Due '+when(a.due_at)+'</small></div>').join("")||'<p class="hub3-empty">No upcoming assignment deadlines.</p>');
 const reviewMarkup=waitingUploads.slice(0,10).map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b><small>'+ (["submitted","pending_review"].includes(String(a.status||"").toLowerCase())?"Awaiting producer review":"Revision requested")+' · '+when(a.created_at)+'</small>'+(a.producer_note?'<p>'+esc(a.producer_note)+'</p>':"")+'</div>');
 const overdueMarkup=overdue.slice(0,10).map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b><small>Overdue assignment · '+when(a.due_at)+'</small></div>');
 const attention=[...reviewMarkup,...overdueMarkup];
 set("h3NeedsAttention",attention.join("")||'<p class="hub3-empty">No submissions are awaiting review and no assignments are overdue.</p>');
}
async function loadContributor(){
 const [assignments,uploads,notifications]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,status,due_at,tn_production_episodes(episode_number,title)").eq("assignee_id",user.id).order("due_at").limit(100)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,producer_note,created_at").eq("uploader_id",user.id).order("created_at",{ascending:false}).limit(12)),
  rows("tn_notifications",db.from("tn_notifications").select("id,title,message,created_at,read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(8))
 ]);
 const now=Date.now(), day=86400000;
 const open=assignments.filter(a=>!["complete","completed","approved","cancelled"].includes(String(a.status||"").toLowerCase()));
 const overdue=open.filter(a=>a.due_at&&new Date(a.due_at).getTime()<now);
 const dueSoon=open.filter(a=>a.due_at&&new Date(a.due_at).getTime()>=now&&new Date(a.due_at).getTime()<=now+7*day);
 const unread=notifications.filter(n=>!n.read_at).length;
 try{await syncAssignmentReminders(assignments);await loadNotifications()}catch(error){console.warn("Deadline reminder sync failed",error)}
 const review=uploads.filter(x=>["submitted","revision","revision_requested","pending_review"].includes(String(x.status||"").toLowerCase())).length;
 set("h3ContributorStats",[
  ["Open assignments",open.length],["Due in 7 days",dueSoon.length],["Overdue",overdue.length],["Unread updates",unread],["Uploads awaiting review",review]
 ].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 const next=open.filter(a=>a.due_at).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at))[0];
 set("h3ContributorNext",next?'<div class="hub3-next-deadline"><span class="hub3-kicker">NEXT DEADLINE</span><b>'+esc(next.title)+'</b><p>'+esc(next.tn_production_episodes?.episode_number||"Episode")+' · '+esc(next.tn_production_episodes?.title||"")+'</p><small>'+when(next.due_at)+'</small></div>':'<p class="hub3-empty">No upcoming assignment deadlines. Check back when a producer assigns your next segment.</p>');
 set("h3MyAssignments",assignments.map(a=>{
  const late=a.due_at&&new Date(a.due_at).getTime()<now&&!["complete","completed","approved","cancelled"].includes(String(a.status||"").toLowerCase());
  return '<article class="hub3-row"><div><b>'+esc(a.title)+'</b><p>'+esc(a.tn_production_episodes?.episode_number||"Episode")+" · "+esc(a.tn_production_episodes?.title||"")+'</p><p>'+esc(a.instructions||"No additional instructions.")+'</p><small class="'+(late?"hub3-overdue":"")+'">Due '+when(a.due_at)+(late?" · OVERDUE":"")+'</small></div>'+status(a.status)+'</article>';
 }).join("")||'<p class="hub3-empty">You do not have any assignments yet. Your producer will post your segment and deadline here.</p>');
 set("h3MyUploads",uploads.map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b>'+status(a.status)+(a.producer_note?'<small class="hub3-producer-note">Producer feedback: '+esc(a.producer_note)+'</small>':"")+'<small>Submitted '+when(a.created_at)+'</small></div>').join("")||'<p class="hub3-empty">Your uploaded segments and producer feedback will appear here.</p>');
 set("h3ContributorUpdates",notifications.slice(0,5).map(n=>'<div class="hub3-mini '+(n.read_at?"":"unread")+'"><b>'+esc(n.title)+'</b><p>'+esc(n.message)+'</p><small>'+when(n.created_at)+(n.read_at?"":" · NEW")+'</small></div>').join("")||'<p class="hub3-empty">No new team updates yet.</p>');
}
async function loadEditing(){
 const list=await rows("tn_production_editing",db.from("tn_production_editing").select("*,tn_production_episodes(episode_number,title,premiere_at)").order("updated_at",{ascending:false}).limit(100));
 const stages=["not_started","ingest","rough_cut","review","revisions","final_cut","approved","scheduled"];
 const counts=stages.map(s=>[s,list.filter(x=>x.status===s).length]);
 set("h3EditingStats",[['In queue',list.filter(x=>!["approved","scheduled"].includes(x.status)).length],["Producer review",list.filter(x=>x.status==="review").length],["Revisions",list.filter(x=>x.status==="revisions").length],["Final cuts",list.filter(x=>x.status==="final_cut").length],["Approved",list.filter(x=>x.status==="approved"||x.status==="scheduled").length]].map(([l,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+l+'</span></div>').join(""));
 set("h3EditingList",list.map(x=>{
  const editor=members.find(m=>m.id===x.editor_id);
  const stageIndex=stages.indexOf(x.status);
  const progress=Math.max(0,Math.round(((stageIndex<0?0:stageIndex)/7)*100));
  return '<article class="hub3-edit-card"><div class="hub3-edit-head"><div><span class="hub3-kicker">'+esc(x.tn_production_episodes?.episode_number||"EPISODE")+'</span><h4>'+esc(x.tn_production_episodes?.title||"Untitled episode")+'</h4></div>'+status(x.status)+'</div><div class="hub3-edit-progress"><span style="width:'+progress+'%"></span></div><div class="hub3-edit-meta"><span>Editor: <b>'+esc(x.editor_id===user.id?"You":editor?.display_name||"Unassigned")+'</b></span><span>Version: <b>'+esc(x.version_label||"Not set")+'</b></span><span>Target: <b>'+when(x.target_ready_at)+'</b></span></div>'+(x.notes?'<p>'+esc(x.notes)+'</p>':"")+(x.review_notes?'<div class="hub3-review-note"><b>Producer review notes</b><p>'+esc(x.review_notes)+'</p></div>':"")+'<div class="hub3-edit-update" data-editing-row="'+esc(x.id)+'"><label>Update stage<select data-editing-stage="'+esc(x.id)+'">'+stages.map(s=>'<option value="'+s+'" '+(s===x.status?"selected":"")+'>'+s.replaceAll("_"," ")+'</option>').join("")+'</select></label><button type="button" class="ph-btn" data-editing-save="'+esc(x.id)+'" '+(!isAdmin?"disabled":"")+'>'+ (isAdmin?"Save stage":"Producer updates only")+'</button></div><small class="hub3-edit-updated">Last updated '+when(x.updated_at)+'</small></article>';
 }).join("")||'<p class="hub3-empty">No editing records yet. Create an episode editing record to start tracking ingest, rough cut, review, revisions, and final approval.</p>');
}
let calendarEvents=[];
function calendarDate(value,opts={}){if(!value)return "Date to be confirmed";return new Date(value).toLocaleString("en-US",{timeZone:"America/Los_Angeles",...opts})}
function renderCalendar(){
 const type=$("#h3CalendarType")?.value||"all",range=$("#h3CalendarRange")?.value||"upcoming",now=Date.now();
 let events=calendarEvents.filter(x=>type==="all"||x.type===type);
 events=events.filter(x=>{const t=new Date(x.start).getTime();if(range==="upcoming")return t>=now-86400000;if(range==="week")return t>=now-86400000&&t<=now+7*86400000;if(range==="month")return t>=now-86400000&&t<=now+31*86400000;return true});
 const countBy=k=>events.filter(x=>x.type===k).length;
 set("h3CalendarStats",[['Upcoming items',events.length],['Deadlines',countBy("deadline")],['Premieres',countBy("premiere")],['Guest sessions',countBy("guest")]].map(([label,n])=>'<div class="hub3-calendar-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 if(!events.length){set("h3CalendarList",'<p class="hub3-empty">No items match this calendar view. Try another time range or category.</p>');return}
 const groups=new Map();
 events.forEach(x=>{const key=calendarDate(x.start,{weekday:"long",month:"long",day:"numeric",year:"numeric"});if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)});
 set("h3CalendarList",Array.from(groups.entries()).map(([day,items])=>'<section class="hub3-calendar-day"><h4>'+esc(day)+'</h4>'+items.map(x=>'<article class="hub3-calendar-event"><div class="hub3-calendar-time">'+(x.allDay?"ALL DAY":esc(calendarDate(x.start,{hour:"numeric",minute:"2-digit"})))+'</div><div class="hub3-calendar-event-main"><div class="hub3-calendar-event-head"><b>'+esc(x.title)+'</b>'+status(x.type)+'</div>'+(x.description?'<p>'+esc(x.description)+'</p>':"")+'<small>'+esc(x.source)+(x.end?' · Ends '+esc(calendarDate(x.end,{hour:"numeric",minute:"2-digit"})):"")+'</small></div></article>').join("")+'</section>').join(""));
}
async function loadCalendar(){
 const from=new Date(Date.now()-14*86400000).toISOString();
 const [saved,assignments,guests]=await Promise.all([
  rows("tn_production_calendar",db.from("tn_production_calendar").select("id,title,description,event_type,starts_at,ends_at,all_day").gte("starts_at",from).order("starts_at").limit(100)),
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,due_at,status,episode_id").not("due_at","is",null).gte("due_at",from).order("due_at").limit(100)),
  isAdmin?rows("tn_production_guests",db.from("tn_production_guests").select("id,guest_name,topic,status,interview_at").not("interview_at","is",null).gte("interview_at",from).order("interview_at").limit(60)):Promise.resolve([])
 ]);
 const items=saved.map(x=>({id:"event-"+x.id,title:x.title,description:x.description,type:x.event_type,start:x.starts_at,end:x.ends_at,allDay:x.all_day,source:"Production event"}));
 episodes.filter(x=>x.premiere_at&&new Date(x.premiere_at).getTime()>=Date.now()-14*86400000).forEach(x=>items.push({id:"episode-"+x.id,title:(x.episode_number?x.episode_number+" · ":"")+x.title,description:x.topic||"Episode premiere",type:"premiere",start:x.premiere_at,source:"Episode schedule"}));
 assignments.filter(x=>!["complete","completed","cancelled"].includes(String(x.status||"").toLowerCase())).forEach(x=>{const ep=episodes.find(e=>e.id===x.episode_id);items.push({id:"assignment-"+x.id,title:x.title,description:x.instructions||"",type:"deadline",start:x.due_at,source:"Contributor deadline"+(ep?" · "+ep.episode_number+" "+ep.title:"")})});
 guests.filter(x=>!["completed","cancelled","declined"].includes(String(x.status||"").toLowerCase())).forEach(x=>items.push({id:"guest-"+x.id,title:"Guest: "+x.guest_name,description:x.topic||"Guest interview",type:"guest",start:x.interview_at,source:"Guest booking"}));
 calendarEvents=items.filter(x=>x.start).sort((a,b)=>new Date(a.start)-new Date(b.start));
 renderCalendar();
}
async function loadResearch(){
 const list=await rows("tn_production_research",db.from("tn_production_research").select("id,title,category,summary,source_url,source_name,status,created_at,created_by").order("created_at",{ascending:false}).limit(60));
 set("h3ResearchList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.title)+'</b><p>'+esc(x.category)+' · '+esc(x.summary)+'</p><small>'+esc(x.source_name||"Source not named")+' · '+when(x.created_at)+'</small>'+(safeHttps(x.source_url)?'<p><a href="'+esc(safeHttps(x.source_url))+'" target="_blank" rel="noopener noreferrer">Open source ↗</a></p>':"")+'</div>'+status(x.status)+'</article>').join("")||'<p class="hub3-empty">The research desk is ready for its first source or story brief.</p>');
}
function renderNotifications(){
 const unread=notificationRows.filter(x=>!x.read_at).length;
 set("h3NotificationSummary",'<div class="hub3-notice-count"><b>'+unread+'</b><span>unread notifications</span><small>'+notificationRows.length+' recent messages</small></div>');
 const list=notificationRows.filter(x=>notificationFilter==="unread"?!x.read_at:notificationFilter==="deadlines"?/deadline|due|overdue/i.test((x.title||"")+" "+(x.message||"")):true);
 set("h3NotificationList",list.map(x=>'<article class="hub3-row '+(x.read_at?"":"unread")+'"><div><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+when(x.created_at)+'</small>'+(safeHttps(x.href)?'<p><a href="'+esc(safeHttps(x.href))+'">Open related item ↗</a></p>':"")+'</div>'+(x.read_at?status("read"):'<button class="ph-btn" data-h3-read="'+esc(x.id)+'">Mark read</button>')+'</article>').join("")||'<p class="hub3-empty">'+(notificationFilter==="unread"?"You have no unread notifications.":notificationFilter==="deadlines"?"No deadline reminders yet.":"You are all caught up. New production notifications will appear here.")+'</p>');
 document.querySelectorAll("[data-h3-notification-filter]").forEach(b=>b.classList.toggle("active",b.dataset.h3NotificationFilter===notificationFilter));
 const all=document.querySelector("[data-h3-read-all]");if(all)all.disabled=unread===0;
}
async function loadNotifications(){
 notificationRows=await rows("tn_notifications",db.from("tn_notifications").select("id,title,message,href,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100));
 renderNotifications();
}
async function syncAssignmentReminders(assignments){
 const now=Date.now(),soon=now+48*60*60*1000,base="https://crowrulesentertainment-oss.github.io/tacomanights/production/";
 const open=assignments.filter(a=>a.due_at&&!["complete","completed","approved","cancelled"].includes(String(a.status||"").toLowerCase()));
 const candidates=[];
 for(const a of open){const due=new Date(a.due_at).getTime(),overdue=due<now;if(!overdue&&due>soon)continue;
  const kind=overdue?"overdue":"due-soon",href=base+"?reminder="+kind+"&assignment="+encodeURIComponent(a.id);
  const ep=a.tn_production_episodes;
  candidates.push({user_id:user.id,title:overdue?"Assignment overdue":"Deadline approaching",message:(a.title||"Your production assignment")+(ep?.episode_number?" · "+ep.episode_number:"")+(overdue?" is past its deadline. Please update your producer.":" is due within 48 hours. Please submit your segment on time."),href});
 }
 if(!candidates.length)return;
 const hrefs=candidates.map(x=>x.href);
 const existing=await rows("tn_notifications",db.from("tn_notifications").select("href").eq("user_id",user.id).in("href",hrefs));
 const seen=new Set(existing.map(x=>x.href)),fresh=candidates.filter(x=>!seen.has(x.href));
 if(!fresh.length)return;
 const {error}=await db.from("tn_notifications").insert(fresh);
 if(error){console.warn("Assignment reminders could not be created",error.message);return}
}
async function loadGuests(){
 if(!isAdmin){set("h3GuestList",'<p class="hub3-empty">Guest contact details are restricted to producers and administrators.</p>');return}
 const list=await rows("tn_production_guests",db.from("tn_production_guests").select("id,guest_name,email,organization,topic,status,interview_at,meeting_url").order("created_at",{ascending:false}).limit(60));
 set("h3GuestList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.guest_name)+'</b><p>'+esc(x.organization||"Independent guest")+' · '+esc(x.email||"No email")+'</p><p>'+esc(x.topic||"Topic to be confirmed")+'</p><small>'+when(x.interview_at)+'</small>'+(safeHttps(x.meeting_url)?'<p><a href="'+esc(safeHttps(x.meeting_url))+'" target="_blank" rel="noopener noreferrer">Meeting link ↗</a></p>':"")+'</div><select data-h3-guest-status="'+esc(x.id)+'">'+["prospect","invited","confirmed","scheduled","completed","declined","cancelled"].map(s=>'<option value="'+s+'" '+(x.status===s?"selected":"")+'>'+s.replaceAll("_"," ")+'</option>').join("")+'</select></article>').join("")||'<p class="hub3-empty">No guest bookings yet. Add your first guest.</p>');
}
async function loadChat(){
 const list=await rows("tn_production_chat_messages",db.from("tn_production_chat_messages").select("id,display_name,message,created_at,user_id").order("created_at",{ascending:false}).limit(60));
 set("h3ChatMessages",list.reverse().map(x=>'<article class="hub3-chat-message"><b>'+esc(x.display_name)+'</b><p>'+esc(x.message)+'</p><small>'+when(x.created_at)+'</small></article>').join("")||'<p class="hub3-empty">No team messages yet.</p>');const updates=await rows("tn_production_updates",db.from("tn_production_updates").select("id,title,body,published_at").eq("visibility","team").order("published_at",{ascending:false}).limit(8));set("h3Announcements",updates.map(x=>'<div class="hub3-mini"><b>'+esc(x.title)+'</b><small>'+when(x.published_at)+'</small><p>'+esc(x.body)+'</p></div>').join("")||'<p class="hub3-empty">No team announcements yet.</p>');
}
async function loadTraining(){
 const [list,progress]=await Promise.all([rows("tn_production_training",db.from("tn_production_training").select("id,title,category,description,resource_url,content").eq("is_published",true).order("sort_order")),rows("tn_production_training_progress",db.from("tn_production_training_progress").select("resource_id,completed_at").eq("user_id",user.id))]);
 const done=new Set(progress.map(x=>x.resource_id));
 set("h3TrainingList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.title)+'</b><p>'+esc(x.description)+'</p><small>'+esc(x.category.replaceAll("_"," "))+'</small>'+(x.content?'<p>'+esc(x.content)+'</p>':"")+(safeHttps(x.resource_url)?'<p><a href="'+esc(safeHttps(x.resource_url))+'" target="_blank" rel="noopener noreferrer">Open learning resource ↗</a></p>':"")+'</div>'+(done.has(x.id)?status("completed"):'<button class="ph-btn" data-h3-complete="'+esc(x.id)+'">Mark complete</button>')+'</article>').join("")||'<p class="hub3-empty">Training resources will appear here as producers publish them.</p>');
}
async function loadAnalytics(){
 if(!isAdmin){set("h3AnalyticsStats",'<p class="hub3-empty">Production analytics are restricted to producers and administrators.</p>');set("h3AnalyticsBreakdown","");return}
 const [assignmentRows,uploadRows,editRows,activityRows,guestTotal,feedbackTotal]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,status,due_at,assignee_id,created_at").order("created_at",{ascending:false}).limit(500)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,uploader_id,created_at,reviewed_at").order("created_at",{ascending:false}).limit(500)),
  rows("tn_production_editing",db.from("tn_production_editing").select("id,status,editor_id,created_at,updated_at,approved_at").order("updated_at",{ascending:false}).limit(300)),
  rows("tn_production_activity",db.from("tn_production_activity").select("id,actor_id,action,detail,created_at").order("created_at",{ascending:false}).limit(100)),
  count("tn_production_guests"),count("tn_production_feedback")
 ]);
 const norm=v=>String(v||"").toLowerCase().replaceAll(" ","_");
 const done=a=>["complete","completed","approved","published","done"].includes(norm(a.status));
 const openAssignments=assignmentRows.filter(a=>!done(a)&&!["cancelled","rejected"].includes(norm(a.status)));
 const overdue= openAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()<Date.now());
 const approvedUploads=uploadRows.filter(a=>norm(a.status)==="approved");
 const pendingUploads=uploadRows.filter(a=>["submitted","pending_review","revision","revision_requested"].includes(norm(a.status)));
 const reviewedUploads=uploadRows.filter(a=>a.reviewed_at&&a.created_at);
 const reviewHours=reviewedUploads.map(a=>(new Date(a.reviewed_at)-new Date(a.created_at))/36e5).filter(n=>Number.isFinite(n)&&n>=0);
 const avgReview=reviewHours.length?reviewHours.reduce((a,b)=>a+b,0)/reviewHours.length:null;
 const activeEdits=editRows.filter(a=>!["approved","scheduled","published","complete","completed"].includes(norm(a.status)));
 const weekAgo=Date.now()-7*864e5;
 const weeklyActivity=activityRows.filter(a=>a.created_at&&new Date(a.created_at).getTime()>=weekAgo);
 const publishedEpisodes=episodes.filter(e=>["published","complete","completed"].includes(norm(e.status))).length;
 const episodeProgress=episodes.length?Math.round(publishedEpisodes/episodes.length*100):0;
 const deliveryRate=assignmentRows.length?Math.round(assignmentRows.filter(done).length/assignmentRows.length*100):0;
 const approvalRate=uploadRows.length?Math.round(approvedUploads.length/uploadRows.length*100):0;
 const stat=(n,l,sub="")=>'<div class="hub3-stat"><b>'+n+'</b><span>'+l+'</span>'+(sub?'<small>'+sub+'</small>':"")+'</div>';
 set("h3AnalyticsStats",[
  stat(episodes.length,"Episodes in system",publishedEpisodes+" completed / published"),
  stat(openAssignments.length,"Open assignments",overdue.length+" currently overdue"),
  stat(deliveryRate+"%","Assignment completion",assignmentRows.length+" tracked assignments"),
  stat(uploadRows.length,"Segment submissions",approvedUploads.length+" approved · "+pendingUploads.length+" awaiting action"),
  stat(avgReview===null?"—":avgReview<24?avgReview.toFixed(1)+"h":(avgReview/24).toFixed(1)+"d","Average review turnaround",reviewedUploads.length+" uploads with review timestamps"),
  stat(activeEdits.length,"Active editing jobs",editRows.length+" editing records"),
  stat(weeklyActivity.length,"Activity · last 7 days",activityRows.length+" recent activity records loaded"),
  stat(guestTotal,"Guest records",feedbackTotal+" audience responses")
 ].join(""));
 const memberName=id=>{const m=members.find(x=>x.id===id);return m?.display_name||m?.email||"Unassigned / team member"};
 const byPerson=new Map();
 assignmentRows.forEach(a=>{const k=a.assignee_id||"unassigned";if(!byPerson.has(k))byPerson.set(k,{name:memberName(a.assignee_id),assigned:0,done:0,late:0});const x=byPerson.get(k);x.assigned++;if(done(a))x.done++;if(!done(a)&&a.due_at&&new Date(a.due_at).getTime()<Date.now())x.late++});
 const people=[...byPerson.values()].sort((a,b)=>b.assigned-a.assigned);
 const bars=(value,total)=>'<span class="hub3-analytics-bar"><i style="width:'+Math.max(0,Math.min(100,total?value/total*100:0))+'%"></i></span>';
 const peopleHtml=people.length?people.map(p=>'<div class="hub3-analytics-person"><div><b>'+esc(p.name)+'</b><small>'+p.done+'/'+p.assigned+' completed · '+p.late+' overdue</small></div>'+bars(p.done,p.assigned)+'</div>').join(""):'<p class="hub3-empty">Contributor delivery metrics will appear when assignments are created.</p>';
 const stageCounts=new Map();editRows.forEach(x=>stageCounts.set(norm(x.status)||"unknown",(stageCounts.get(norm(x.status)||"unknown")||0)+1));
 const stageHtml=stageCounts.size?[...stageCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([s,n])=>'<div class="hub3-analytics-line"><span>'+esc(s.replaceAll("_"," "))+'</span><b>'+n+'</b></div>').join(""):'<p class="hub3-empty">No editing records yet.</p>';
 const uploadStages=new Map();uploadRows.forEach(x=>uploadStages.set(norm(x.status)||"unknown",(uploadStages.get(norm(x.status)||"unknown")||0)+1));
 const uploadHtml=uploadStages.size?[...uploadStages.entries()].sort((a,b)=>b[1]-a[1]).map(([s,n])=>'<div class="hub3-analytics-line"><span>'+esc(s.replaceAll("_"," "))+'</span><b>'+n+'</b></div>').join(""):'<p class="hub3-empty">No segment submissions yet.</p>';
 const activityHtml=weeklyActivity.slice(0,8).map(a=>'<article class="hub3-activity"><div class="hub3-activity-top"><b>'+esc(memberName(a.actor_id))+' · '+esc(String(a.action||"Production update").replaceAll("_"," "))+'</b><time>'+when(a.created_at)+'</time></div>'+(a.detail?'<p>'+esc(a.detail)+'</p>':"")+'</article>').join("")||'<p class="hub3-empty">No recorded team activity in the last seven days.</p>';
 const note=episodes.length||assignmentRows.length||uploadRows.length||editRows.length?'Figures use up to 500 assignments, 500 submissions, 300 editing records and 100 recent activity records visible to this producer account. Completion is based on current status; on-time completion is not calculated because assignments do not store a completion timestamp.':'No production records have been entered yet. As the team creates episodes, assigns work and submits segments, this dashboard will populate automatically.';
 set("h3AnalyticsBreakdown",'<div class="hub3-analytics-grid"><section><h4>Contributor delivery</h4>'+peopleHtml+'</section><section><h4>Editing pipeline</h4>'+stageHtml+'</section><section><h4>Submission review queue</h4>'+uploadHtml+'</section><section><h4>Recent production activity</h4>'+activityHtml+'</section></div><p class="hub3-small hub3-analytics-footnote">'+note+' Episode completion rate: '+episodeProgress+'%. Upload approval rate: '+approvalRate+'%.</p>');
}
let feedbackRows=[],feedbackStatusFilter="all",feedbackCategoryFilter="all",feedbackSearch="";
function renderFeedback(){
 const norm=v=>String(v||"").toLowerCase();
 const filtered=feedbackRows.filter(x=>(feedbackStatusFilter==="all"||x.status===feedbackStatusFilter)&&(feedbackCategoryFilter==="all"||x.category===feedbackCategoryFilter)&&(!feedbackSearch||[x.submitter_name,x.submitter_email,x.message,x.category].some(v=>norm(v).includes(feedbackSearch))));
 const categories=[...new Set(feedbackRows.map(x=>x.category).filter(Boolean))].sort();
 const counts={pending:0,reviewing:0,considered:0,featured:0,closed:0};feedbackRows.forEach(x=>{if(Object.hasOwn(counts,x.status))counts[x.status]++});
 const summary='<div class="hub3-feedback-stats">'+[['Pending',counts.pending],['Reviewing',counts.reviewing],['Considered',counts.considered],['Featured',counts.featured],['Closed',counts.closed]].map(([label,n])=>'<div><b>'+n+'</b><span>'+label+'</span></div>').join("")+'</div>';
 const controls='<div class="hub3-feedback-controls"><label>Search<input type="search" id="h3FeedbackSearch" value="'+esc(feedbackSearch)+'" placeholder="Name, email, category or message"></label><label>Status<select id="h3FeedbackStatus"><option value="all">All statuses</option>'+["pending","reviewing","considered","featured","closed"].map(s=>'<option value="'+s+'" '+(feedbackStatusFilter===s?"selected":"")+'>'+s[0].toUpperCase()+s.slice(1)+'</option>').join("")+'</select></label><label>Category<select id="h3FeedbackCategory"><option value="all">All categories</option>'+categories.map(s=>'<option value="'+esc(s)+'" '+(feedbackCategoryFilter===s?"selected":"")+'>'+esc(s.replaceAll("_"," "))+'</option>').join("")+'</select></label><span class="hub3-feedback-result">'+filtered.length+' of '+feedbackRows.length+' submissions</span></div>';
 const cards=filtered.map(x=>'<article class="hub3-feedback-card"><div class="hub3-feedback-card-head"><div><span class="hub3-kicker">'+esc(x.category.replaceAll("_"," "))+'</span><h4>'+esc(x.submitter_name||"Community member")+'</h4><small>'+esc(x.submitter_email||"No email provided")+' · '+when(x.created_at)+'</small></div><span class="hub3-feedback-rating">'+(x.rating?("★".repeat(Math.max(0,Math.min(5,Number(x.rating))))):"No rating")+'</span></div><p class="hub3-feedback-message">'+esc(x.message)+'</p><div class="hub3-feedback-actions"><label>Review status<select data-h3-feedback="'+esc(x.id)+'"><option value="pending" '+(x.status==="pending"?"selected":"")+'>Pending</option><option value="reviewing" '+(x.status==="reviewing"?"selected":"")+'>Reviewing</option><option value="considered" '+(x.status==="considered"?"selected":"")+'>Considered</option><option value="featured" '+(x.status==="featured"?"selected":"")+'>Featured</option><option value="closed" '+(x.status==="closed"?"selected":"")+'>Closed</option></select></label><small>'+(x.reviewed_at?"Last reviewed "+when(x.reviewed_at):"Not yet reviewed")+'</small></div></article>').join("");
 set("h3FeedbackList",summary+controls+(cards||'<p class="hub3-empty">'+(feedbackRows.length?"No submissions match these filters.":"No audience feedback has been received yet.")+'</p>'));
}
async function loadFeedback(){
 if(!isAdmin){set("h3FeedbackList",'<p class="hub3-empty">Audience submissions are private to producers and administrators. Use the public feedback form below the page hero to share a response.</p>');return}
 feedbackRows=await rows("tn_production_feedback",db.from("tn_production_feedback").select("id,submitter_name,submitter_email,category,rating,message,status,reviewed_by,reviewed_at,created_at").order("created_at",{ascending:false}).limit(200));
 renderFeedback();
}
async function loadReviewDesk(){
 if(!isAdmin){set("h3ReviewQueue",'<p class="hub3-empty">Segment review is restricted to producers and administrators.</p>');return}
 const list=await rows("tn_production_uploads",db.from("tn_production_uploads").select("id,episode_id,uploader_id,title,notes,storage_path,original_filename,mime_type,file_size,status,producer_note,created_at,reviewed_at,tn_production_episodes(episode_number,title)").order("created_at",{ascending:false}).limit(60));
 const pending=list.filter(x=>["submitted","pending_review","revision","revision_requested"].includes(String(x.status||"").toLowerCase()));
 if(!pending.length){set("h3ReviewQueue",'<p class="hub3-empty">No segment submissions are waiting for review. New uploads will appear here.</p>');return}
 const cards=await Promise.all(pending.map(async x=>{
  let url="";
  try{const {data,error}=await db.storage.from("tn-production-private").createSignedUrl(x.storage_path,900);if(!error)url=data.signedUrl}catch(error){console.warn("Could not create private preview URL",error)}
  const mime=String(x.mime_type||"").toLowerCase(),safeUrl=safeHttps(url);
  let preview=safeUrl?(mime.startsWith("video/")?'<video class="h3-review-media" controls preload="metadata" src="'+esc(safeUrl)+'"></video>':mime.startsWith("audio/")?'<audio class="h3-review-audio" controls preload="metadata" src="'+esc(safeUrl)+'"></audio>':mime.startsWith("image/")?'<a href="'+esc(safeUrl)+'" target="_blank" rel="noopener noreferrer"><img class="h3-review-image" src="'+esc(safeUrl)+'" alt="Submitted segment preview"></a>':'<a class="h3-review-file" href="'+esc(safeUrl)+'" target="_blank" rel="noopener noreferrer">Open / download original file ↗</a>'):'<p class="hub3-small">Preview unavailable. Check the private storage object and permissions.</p>';
  const member=members.find(m=>m.id===x.uploader_id),episode=x.tn_production_episodes;
  const mb=Number(x.file_size||0),size=mb>=1073741824?(mb/1073741824).toFixed(2)+" GB":mb>=1048576?(mb/1048576).toFixed(1)+" MB":mb?Math.max(1,Math.round(mb/1024))+" KB":"Size unavailable";
  return '<article class="hub3-review-card" data-review-card="'+esc(x.id)+'"><div class="hub3-review-head"><div><span class="hub3-kicker">'+esc(episode?.episode_number||"GENERAL SUBMISSION")+'</span><h4>'+esc(x.title||x.original_filename||"Untitled submission")+'</h4><p>'+esc(episode?.title||"No episode linked")+'</p></div>'+status(x.status)+'</div><div class="hub3-review-meta"><span>Submitted by <b>'+esc(member?.display_name||member?.email||"Team member")+'</b></span><span>'+when(x.created_at)+'</span><span>'+esc(x.original_filename||"File")+' · '+size+'</span></div>'+preview+(x.notes?'<p class="hub3-review-notes"><b>Contributor notes:</b> '+esc(x.notes)+'</p>':"")+(x.producer_note?'<p class="hub3-review-notes"><b>Previous producer feedback:</b> '+esc(x.producer_note)+'</p>':"")+'<label class="hub3-review-label">Producer feedback<textarea data-h3-review-note rows="2" maxlength="1500" placeholder="Add approval notes or explain the changes needed…">'+esc(x.producer_note||"")+'</textarea></label><div class="hub3-review-actions"><button type="button" class="ph-btn primary" data-h3-review="'+esc(x.id)+'" data-review-status="approved">Approve segment</button><button type="button" class="ph-btn" data-h3-review="'+esc(x.id)+'" data-review-status="revision">Request revisions</button><button type="button" class="ph-btn danger" data-h3-review="'+esc(x.id)+'" data-review-status="rejected">Reject submission</button></div><p class="hub3-status" data-h3-review-status aria-live="polite"></p></article>';
 }));
 set("h3ReviewQueue",cards.join(""));
}
async function reviewSubmission(button){
 if(!isAdmin)return;
 const card=button.closest("[data-review-card]"),id=button.dataset.h3Review,next=button.dataset.reviewStatus,note=card?.querySelector("[data-h3-review-note]")?.value.trim()||"";
 if(!card||!id||!["approved","revision","rejected"].includes(next))return;
 if((next==="revision"||next==="rejected")&&!note){card.querySelector("[data-h3-review-status]").textContent="Add a note explaining the requested changes or rejection.";return}
 const buttons=[...card.querySelectorAll("[data-h3-review]")],statusEl=card.querySelector("[data-h3-review-status]");
 buttons.forEach(b=>b.disabled=true);statusEl.textContent="Saving review…";
 try{
  const {data:upload,error}=await db.from("tn_production_uploads").update({status:next,producer_note:note||null,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",id).select("id,uploader_id,title").single();
  if(error)throw error;
  const titles={approved:"Segment approved",revision:"Revisions requested",rejected:"Submission not approved"};
  const messages={approved:"Your segment “"+(upload.title||"Untitled submission")+"” has been approved.",revision:"Your segment “"+(upload.title||"Untitled submission")+"” needs revisions: "+note,rejected:"Your submission “"+(upload.title||"Untitled submission")+"” was not approved: "+note};
  const {error:notificationError}=await db.from("tn_notifications").insert({user_id:upload.uploader_id,title:titles[next],message:messages[next],href:"https://crowrulesentertainment-oss.github.io/tacomanights/production/"});
  if(notificationError)console.warn("Contributor notification could not be sent",notificationError.message);
  await logActivity("upload_"+next,(upload.title||"Segment")+" · contributor "+upload.uploader_id);
  await refresh();
 }catch(error){statusEl.textContent="Review could not be saved: "+(error.message||"Try again.");buttons.forEach(b=>b.disabled=false)}
}
async function loadActivity(){
  if(!isAdmin){set("h3ActivityFeed",'<p class="hub3-empty">The production activity log is restricted to producers and administrators.</p>');return}
  const list=await rows("tn_production_activity",db.from("tn_production_activity").select("id,actor_id,action,detail,created_at").order("created_at",{ascending:false}).limit(30));
  set("h3ActivityFeed",list.map(x=>'<article class="hub3-activity"><div class="hub3-activity-top"><b>'+esc(members.find(m=>m.id===x.actor_id)?.display_name||"Production team")+'</b><time>'+when(x.created_at)+'</time></div><p>'+esc(x.action.replaceAll("_"," "))+(x.detail?' · '+esc(x.detail):"")+'</p></article>').join("")||'<p class="hub3-empty">No production activity has been recorded yet.</p>');
}
async function logActivity(action,detail){
  try{const {error}=await db.from("tn_production_activity").insert({actor_id:user.id,action,detail:detail||null});if(error){console.warn("Production activity log",error.message);return}if(isAdmin)await loadActivity()}catch(error){console.warn("Production activity log",error)}
}
async function loadRecognition(){
 const list=await rows("tn_production_recognition",db.from("tn_production_recognition").select("id,recipient_name,award_name,reason,awarded_at").order("awarded_at",{ascending:false}).limit(60));
 set("h3RecognitionList",list.map(x=>'<article class="hub3-row recognition"><div><b>'+esc(x.recipient_name)+'</b><p>'+esc(x.reason)+'</p><small>'+when(x.awarded_at)+'</small></div><span class="hub3-award">'+esc(x.award_name)+'</span></article>').join("")||'<p class="hub3-empty">The recognition wall is ready for its first shout-out.</p>');
}
async function submit(form){
 const type=form.dataset.h3Form,d=formData(form);notice(form,"Saving…");
 try{
  let result;
  if(type==="research"&&d.source_url&&!safeHttps(d.source_url))throw new Error("Research source links must use HTTPS.");
  if(type==="guest"&&d.meeting_url&&!safeHttps(d.meeting_url))throw new Error("Meeting links must use HTTPS.");
  if(type==="training"&&d.resource_url&&!safeHttps(d.resource_url))throw new Error("Training resource links must use HTTPS.");
  if(type==="calendar"&&d.ends_at&&new Date(d.ends_at)<new Date(d.starts_at))throw new Error("The event end time must be after its start time.");
  if(type==="research"){result=await db.from("tn_production_research").insert({episode_id:d.episode_id||null,title:d.title,category:d.category,source_name:d.source_name||null,source_url:d.source_url||null,summary:d.summary,created_by:user.id});}
  if(type==="editing"){const editorId=d.editor_id||user.id;const payload={episode_id:d.episode_id,status:d.status,version_label:d.version_label||null,target_ready_at:d.target_ready_at?new Date(d.target_ready_at).toISOString():null,notes:d.notes||null,review_notes:d.review_notes||null,updated_by:user.id,editor_id:editorId,updated_at:new Date().toISOString()};if(d.status==="approved"){payload.approved_by=user.id;payload.approved_at=new Date().toISOString()}else{payload.approved_by=null;payload.approved_at=null}result=await db.from("tn_production_editing").upsert(payload,{onConflict:"episode_id"});if(!result.error&&editorId!==user.id){const ep=episodes.find(x=>x.id===d.episode_id);const notice=await db.from("tn_notifications").insert({user_id:editorId,title:"Editing assignment",message:"You have been assigned to edit "+(ep?.episode_number?ep.episode_number+" · ":"")+(ep?.title||"an episode")+". Check the Production Hub for details.",href:"https://crowrulesentertainment-oss.github.io/tacomanights/production/"});if(notice.error)console.warn("Editor notification was not sent",notice.error)}}
  if(type==="calendar"){result=await db.from("tn_production_calendar").insert({title:d.title,event_type:d.event_type,starts_at:new Date(d.starts_at).toISOString(),ends_at:d.ends_at?new Date(d.ends_at).toISOString():null,description:d.description||null,created_by:user.id});}
  if(type==="guest"){result=await db.from("tn_production_guests").insert({guest_name:d.guest_name,email:d.email||null,organization:d.organization||null,episode_id:d.episode_id||null,topic:d.topic||null,status:d.status,interview_at:d.interview_at?new Date(d.interview_at).toISOString():null,meeting_url:d.meeting_url||null,created_by:user.id});}
  if(type==="chat"){result=await db.from("tn_production_chat_messages").insert({user_id:user.id,display_name:profile.display_name||user.email,message:d.message.trim()});}
  if(type==="training"){result=await db.from("tn_production_training").insert({title:d.title,category:d.category,description:d.description,resource_url:d.resource_url||null,content:d.content||null,is_published:true,created_by:user.id});}
  if(type==="recognition"){const recipient=members.find(m=>m.id===d.recipient_id);result=await db.from("tn_production_recognition").insert({recipient_id:d.recipient_id,recipient_name:recipient?.display_name||recipient?.email||"Team member",award_name:d.award_name,reason:d.reason,episode_id:d.episode_id||null,awarded_by:user.id});}
  if(!result)throw new Error("This form could not be matched to a production action.");
  if(result.error)throw result.error;
  form.reset();notice(form,"Saved successfully.");await logActivity(type==="chat"?"team_message":"created_"+type,type==="chat"?"Posted a team message":(d.title||d.guest_name||d.award_name||"Production record"));await refresh();
 }catch(e){notice(form,"Could not save: "+(e.message||"Please try again."))}
}
async function init(){
 if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseAnonKey){const st=$("#h3PublicFeedbackForm .hub3-status");if(st)st.textContent="The feedback service is temporarily unavailable. Please try again later.";return;}
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const publicForm=$("#h3PublicFeedbackForm");
 publicForm?.addEventListener("submit",async e=>{e.preventDefault();const d=formData(publicForm),st=publicForm.querySelector(".hub3-status");st.textContent="Sending…";try{const {error}=await db.from("tn_production_feedback").insert({submitter_name:d.submitter_name||null,submitter_email:d.submitter_email||null,category:d.category,rating:d.rating?Number(d.rating):null,message:d.message,status:"pending"});if(error)throw error;publicForm.reset();st.textContent="Thank you. Your feedback has been sent to the production team for review."}catch(err){st.textContent="Your message could not be sent: "+err.message}});
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 user=session.user;const {data:p,error}=await db.from("tn_production_profiles").select("id,display_name,email,role").eq("id",user.id).maybeSingle();if(error||!p||!["contributor","producer","admin"].includes(p.role))return;
 profile=p;isAdmin=["producer","admin"].includes(p.role);
 const shell=$("#hub3Shell");shell?.classList.add("ready");
 document.querySelectorAll(".hub3-tab").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.h3Tab)));
 $("#h3CalendarRange")?.addEventListener("change",renderCalendar);
 $("#h3CalendarType")?.addEventListener("change",renderCalendar);
 $("#h3CalendarRefresh")?.addEventListener("click",()=>loadCalendar().catch(e=>{set("h3CalendarList",'<p class="hub3-empty">Calendar refresh failed: '+esc(e.message||"Please try again.")+'</p>')}));

 document.querySelectorAll("[data-h3-go]").forEach(b=>b.addEventListener("click",()=>{tab(b.dataset.h3Go);document.querySelector(".hub3-nav")?.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll("[data-h3-legacy]").forEach(b=>b.addEventListener("click",()=>{const target=document.getElementById(b.dataset.h3Legacy);if(!target)return;document.querySelectorAll(".ph-view").forEach(v=>v.classList.remove("active"));target.classList.add("active");document.querySelectorAll(".ph-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===b.dataset.h3Legacy.replace("view-","")));target.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll(".hub3-form").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();submit(f)}));
 document.querySelector("[data-h3-refresh]")?.addEventListener("click",refresh);
 document.addEventListener("click",async e=>{
  const review=e.target.closest("[data-h3-review]");if(review){await reviewSubmission(review);return}
  const filter=e.target.closest("[data-h3-notification-filter]");if(filter){notificationFilter=filter.dataset.h3NotificationFilter;renderNotifications()}
  const readAll=e.target.closest("[data-h3-read-all]");if(readAll){readAll.disabled=true;const {error}=await db.from("tn_notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);if(error){readAll.disabled=false;alert("Could not mark notifications as read: "+error.message)}else{await logActivity("notifications_read_all","Marked all notifications as read");await loadNotifications()}}
  const read=e.target.closest("[data-h3-read]");if(read){const {error}=await db.from("tn_notifications").update({read_at:new Date().toISOString()}).eq("id",read.dataset.h3Read).eq("user_id",user.id);if(!error){await logActivity("notification_read","Marked a notification as read");await loadNotifications()}}
  const complete=e.target.closest("[data-h3-complete]");if(complete){const {error}=await db.from("tn_production_training_progress").upsert({resource_id:complete.dataset.h3Complete,user_id:user.id,completed_at:new Date().toISOString()},{onConflict:"resource_id,user_id"});if(!error){await logActivity("training_completed","Completed a training resource");loadTraining()}else alert(error.message)}
 });
 document.addEventListener("click",async e=>{const save=e.target.closest("[data-editing-save]");if(!save||!isAdmin)return;const id=save.dataset.editingSave;const row=save.closest("[data-editing-row]");const stage=row?.querySelector("[data-editing-stage]")?.value;if(!stage)return;save.disabled=true;const payload={status:stage,updated_by:user.id,updated_at:new Date().toISOString()};if(stage==="approved"){payload.approved_by=user.id;payload.approved_at=new Date().toISOString()}else{payload.approved_by=null;payload.approved_at=null}const {error}=await db.from("tn_production_editing").update(payload).eq("id",id);save.disabled=false;if(error){alert("Could not update editing stage: "+error.message);return}await logActivity("editing_stage_updated","Moved an episode edit to "+stage.replaceAll("_"," "));await refresh()});
 document.addEventListener("input",e=>{if(e.target.id==="h3FeedbackSearch"){feedbackSearch=e.target.value.trim().toLowerCase();renderFeedback()}});
 document.addEventListener("change",async e=>{if(e.target.id==="h3FeedbackStatus"){feedbackStatusFilter=e.target.value;renderFeedback()}if(e.target.id==="h3FeedbackCategory"){feedbackCategoryFilter=e.target.value;renderFeedback()}const field=e.target.closest("[data-h3-feedback]");if(field&&isAdmin){field.disabled=true;const {error}=await db.from("tn_production_feedback").update({status:field.value,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",field.dataset.h3Feedback);if(error){field.disabled=false;alert("Could not update feedback status: "+error.message)}else{await logActivity("feedback_updated","Changed audience feedback status to "+field.value);await loadFeedback()}}const guest=e.target.closest("[data-h3-guest-status]");if(guest&&isAdmin){const {error}=await db.from("tn_production_guests").update({status:guest.value,updated_at:new Date().toISOString()}).eq("id",guest.dataset.h3GuestStatus);if(error)alert(error.message);else await logActivity("guest_status_updated","Changed guest booking status to "+guest.value)}});
 await refresh();
}
init().catch(e=>{console.error("Production Hub 3.0 could not initialize",e);["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"].forEach(id=>set(id,'<p class="hub3-empty">The production workspace could not initialize: '+esc(e?.message||"Please refresh and try again.")+'</p>'))});
})();