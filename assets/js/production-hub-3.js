(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const when=v=>{if(!v)return"Not scheduled";const d=new Date(v);return Number.isNaN(d.getTime())?"Date unavailable":d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})};
const safeHttps=value=>{if(!value)return"";try{const u=new URL(String(value));return u.protocol==="https:"?u.href:""}catch{return""}};
const root=document.body.dataset.root||"../";
let db,user,profile,isAdmin=false,episodes=[],members=[],notificationRows=[],notificationFilter='all',recognitionRows=[],recognitionSearch="",recognitionAwardFilter="all";
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
 const tasks=[["Command center",["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"],loadCommand],["Contributor workspace",["h3ContributorStats","h3ContributorNext","h3MyAssignments","h3MyUploads","h3ContributorUpdates"],loadContributor],["Editing room",["h3EditingStats","h3EditingList"],loadEditing],["Production calendar",["h3CalendarList"],loadCalendar],["Research desk",["h3ResearchList"],loadResearch],["Notifications",["h3NotificationList"],loadNotifications],["Guest bookings",["h3GuestList"],loadGuests],["Communication center",["h3ChatMessages","h3Announcements"],loadChat],["Training center",["h3TrainingList"],loadTraining],["Production analytics",["h3AnalyticsStats","h3AnalyticsBreakdown"],loadAnalytics],["Audience feedback",["h3FeedbackList"],loadFeedback],["Crew recognition",["h3RecognitionList"],loadRecognition],["Recent activity",["h3ActivityFeed"],loadActivity],["Producer review desk",["h3ReviewQueue"],loadReviewDesk],["Contributor requests",["h3MyRequests","h3RequestReviewQueue"],loadRequests]];
 await Promise.all(tasks.map(async([label,targets,fn])=>{try{await fn()}catch(error){console.error(label,error);const html='<p class="hub3-empty">Could not load '+label.toLowerCase()+': '+esc(error?.message||"Please try again.")+'</p>';targets.forEach(id=>set(id,html))}}));
}
async function loadBase(){
 episodes=await rows("tn_production_episodes",db.from("tn_production_episodes").select("id,episode_number,title,topic,premiere_at,status").order("premiere_at",{ascending:true}));
 $("#h3EditingEpisode").innerHTML=options(episodes,"Choose episode…");$("#h3ResearchEpisode").innerHTML=options(episodes,"General research / idea vault");const researchOwner=$("#h3ResearchOwner");if(researchOwner&&isAdmin)researchOwner.innerHTML='<option value="">Unassigned</option>'+members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+'</option>').join("");$("#h3GuestEpisode").innerHTML=options(episodes,"Not assigned yet");$("#h3RecognitionEpisode").innerHTML=options(episodes,"General contribution");
 if(isAdmin){members=await rows("tn_production_profiles",db.from("tn_production_profiles").select("id,display_name,email,role,requested_role,application_note,skills,segment_interests").in("role",["contributor","producer","admin"]).order("display_name"));$("#h3RecognitionMember").innerHTML=members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+'</option>').join("");const editor=$("#h3EditingEditor");if(editor)editor.innerHTML='<option value="">Assign to me</option>'+members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+' · '+esc(m.role)+'</option>').join("")}
 document.querySelectorAll(".hub3-form button.admin-only").forEach(b=>b.classList.toggle("hidden",!isAdmin));document.querySelectorAll(".hub3-form[data-admin-only]").forEach(form=>form.classList.toggle("hidden",!isAdmin));document.querySelectorAll("[data-h3-admin-only]").forEach(el=>el.classList.toggle("hidden",!isAdmin));
}


async function loadRequests(){
 const all=await rows("tn_production_requests",db.from("tn_production_requests").select("id,requester_id,request_type,assignment_id,requested_status,starts_on,ends_on,availability_slots,details,status,review_note,reviewed_at,created_at").order("created_at",{ascending:false}).limit(150));
 const label={assignment_status:"Assignment status",availability:"Availability",time_off:"Time off"};
 const slotSummary=slots=>(Array.isArray(slots)&&slots.length?'<div class="h3-request-slots">'+slots.map(s=>'<span>'+esc(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][Number(s.weekday)]||"Day") +' · '+esc(s.start_time)+'–'+esc(s.end_time)+' · '+esc(s.timezone||"America/Los_Angeles")+'</span>').join("")+'</div>':"");
 const render=x=>'<article class="h3-request-card"><div class="h3-request-top"><b>'+esc(label[x.request_type]||x.request_type)+'</b>'+status(x.status)+'</div>'+(x.requested_status?'<p><b>Requested status:</b> '+esc(x.requested_status.replaceAll("_"," "))+'</p>':"")+(x.starts_on?'<p><b>Dates:</b> '+esc(x.starts_on)+' – '+esc(x.ends_on||x.starts_on)+'</p>':"")+slotSummary(x.availability_slots)+'<p>'+esc(x.details)+'</p>'+(x.review_note?'<div class="hub3-review-note"><b>Producer response</b><p>'+esc(x.review_note)+'</p></div>':"")+'<small>'+when(x.created_at)+(x.reviewed_at?' · Reviewed '+when(x.reviewed_at):'')+'</small></article>';
 set("h3MyRequests",all.filter(x=>x.requester_id===user.id).map(render).join("")||'<p class="hub3-empty">You have not sent any requests yet.</p>');
 if(!isAdmin){set("h3RequestReviewQueue",'<p class="hub3-empty">Request approvals are restricted to producers and administrators.</p>');return}
 const pending=all.filter(x=>x.status==="pending"),names=new Map(members.map(m=>[m.id,m.display_name||m.email||"Team member"]));
 set("h3RequestReviewQueue",pending.map(x=>'<article class="h3-request-card" data-request-card="'+esc(x.id)+'"><div class="h3-request-top"><b>'+esc(names.get(x.requester_id)||"Contributor")+' · '+esc(label[x.request_type]||x.request_type)+'</b>'+status(x.status)+'</div>'+(x.requested_status?'<p><b>Requested status:</b> '+esc(x.requested_status.replaceAll("_"," "))+'</p>':"")+(x.starts_on?'<p><b>Dates:</b> '+esc(x.starts_on)+' – '+esc(x.ends_on||x.starts_on)+'</p>':"")+slotSummary(x.availability_slots)+'<p>'+esc(x.details)+'</p><label class="h3-request-review-label">Producer response<textarea data-request-note maxlength="1500" rows="2" placeholder="Optional response or instructions"></textarea></label><div class="h3-request-actions"><button class="ph-btn primary" type="button" data-request-review="'+esc(x.id)+'" data-request-decision="approved">Approve</button><button class="ph-btn" type="button" data-request-review="'+esc(x.id)+'" data-request-decision="declined">Decline</button></div><p class="hub3-status" aria-live="polite"></p></article>').join("")||'<p class="hub3-empty">No contributor requests are waiting for review.</p>');
}
async function submitContributorRequest(form){
 const d=formData(form);if(d.request_type==="assignment_status"&&!d.assignment_id){notice(form,"Choose an assignment first.");return}
 if(d.starts_on&&d.ends_on&&d.ends_on<d.starts_on){notice(form,"The end date must be on or after the start date.");return}
 const availabilitySlots=d.request_type==="availability"?[...form.querySelectorAll(".h3-weekday-toggle:checked")].map(check=>({weekday:Number(check.value),start_time:form.querySelector('[data-availability-start="'+check.value+'"]')?.value,end_time:form.querySelector('[data-availability-end="'+check.value+'"]')?.value,timezone:$("#h3AvailabilityTimezone")?.value||"America/Los_Angeles"})):[ ];
 if(d.request_type==="availability"&&!availabilitySlots.length){notice(form,"Choose at least one day for your weekly availability.");return}
 if(availabilitySlots.some(s=>!s.start_time||!s.end_time||s.end_time<=s.start_time)){notice(form,"Each selected day needs a valid end time later than its start time.");return}
 const payload={requester_id:user.id,request_type:d.request_type,assignment_id:d.request_type==="assignment_status"?d.assignment_id:null,requested_status:d.request_type==="assignment_status"?d.requested_status:null,starts_on:d.request_type==="time_off"?(d.starts_on||null):null,ends_on:d.request_type==="time_off"?(d.ends_on||null):null,availability_slots:d.request_type==="availability"?availabilitySlots:null,details:d.details.trim(),status:"pending"};
 const button=form.querySelector('button[type="submit"]');button.disabled=true;notice(form,"Sending your request…");
 try{const {error}=await db.from("tn_production_requests").insert(payload);if(error)throw error;await logActivity("contributor_request_submitted",d.request_type.replaceAll("_"," "));form.reset();updateRequestForm();notice(form,"Request submitted. It is now waiting for producer review.");await loadRequests()}
 catch(error){notice(form,"Could not submit request: "+(error.message||"Please try again."))}
 finally{button.disabled=false}
}
function updateRequestForm(){
 const type=$("#h3RequestType")?.value||"assignment_status",isAssignment=type==="assignment_status",isTimeOff=type==="time_off",isAvailability=type==="availability";
 $("#h3RequestAssignmentWrap")?.classList.toggle("hidden",!isAssignment);$("#h3RequestStatusWrap")?.classList.toggle("hidden",!isAssignment);
 $("#h3RequestStartWrap")?.classList.toggle("hidden",!isTimeOff);$("#h3RequestEndWrap")?.classList.toggle("hidden",!isTimeOff);$("#h3WeeklyAvailabilityWrap")?.classList.toggle("hidden",!isAvailability);
 const assignment=$("#h3RequestAssignment");if(assignment)assignment.required=isAssignment;
 const start=$("#h3RequestStartWrap input"),end=$("#h3RequestEndWrap input");if(start)start.required=isTimeOff;if(end)end.required=isTimeOff;
}
async function reviewContributorRequest(button){
 if(!isAdmin)return;
 const card=button.closest("[data-request-card]"),id=button.dataset.requestReview,decision=button.dataset.requestDecision;
 if(!card||!id||!["approved","declined"].includes(decision))return;
 const note=card.querySelector("[data-request-note]")?.value.trim()||"",buttons=[...card.querySelectorAll("[data-request-review]")],statusEl=card.querySelector(".hub3-status");
 buttons.forEach(b=>b.disabled=true);statusEl.textContent="Saving decision…";
 try{
  const {data:reviewed,error}=await db.rpc("tn_production_review_request",{p_request_id:id,p_decision:decision,p_note:note||null});
  if(error)throw error;
  const req=Array.isArray(reviewed)?reviewed[0]:reviewed;
  if(!req)throw new Error("The request was not returned after review.");
  const label={assignment_status:"Assignment status",availability:"Availability",time_off:"Time-off"}[req.request_type]||"Contributor";
  const {error:notifyError}=await db.from("tn_notifications").insert({user_id:req.requester_id,title:decision==="approved"?"Production request approved":"Production request update",message:label+" request "+decision+". "+(note||""),href:"https://crowrulesentertainment-oss.github.io/tacomanights/production/"});
  if(notifyError)console.warn("Request notification",notifyError.message);
  await logActivity("contributor_request_"+decision,req.request_type+" request from "+req.requester_id);if(decision==="approved"&&req.request_type==="availability")await loadHostAvailability();await loadRequests();
 }catch(error){statusEl.textContent="Could not save decision: "+(error.message||"Please retry.");buttons.forEach(b=>b.disabled=false)}
}

async function loadHostAvailability(){
 const target=$("#h3HostAvailability");if(!target||!isAdmin)return;
 try{
  const [slots,hosts]=await Promise.all([
   rows("tacoma_nights_host_availability",db.from("tacoma_nights_host_availability").select("id,host_id,weekday,start_time,end_time,timezone,notes").order("weekday").order("start_time").limit(300)),
   rows("tacoma_nights_remote_hosts",db.from("tacoma_nights_remote_hosts").select("id,name,on_air_name,role,team_status").limit(300))
  ]);
  const names=new Map(hosts.map(h=>[h.id,h.on_air_name||h.name||"Remote host"]));
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const time=v=>{if(!v)return"";const [hh,mm]=String(v).split(":");const d=new Date();d.setHours(Number(hh),Number(mm||0),0,0);return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})};
  target.innerHTML=slots.length?slots.map(x=>'<article class="h3-availability-row"><div><b>'+esc(names.get(x.host_id)||"Host profile")+'</b><span class="pill">'+esc(days[Number(x.weekday)]||"Day not set")+'</span></div><div><strong>'+esc(time(x.start_time))+' – '+esc(time(x.end_time))+'</strong><small>'+esc(x.timezone||"America/Los_Angeles")+'</small>'+(x.notes?'<small>'+esc(x.notes)+'</small>':"")+'</div></article>').join(""):'<p class="hub3-empty">No recurring host availability has been entered yet. This section will populate when availability is added through the existing host administration workflow.</p>';
 }catch(error){target.innerHTML='<p class="hub3-empty">Host availability could not be loaded: '+esc(error.message||"Please retry.")+'</p>'}
}

function renderScheduleIntelligence(assignments,calendarRows,guestRows,byPerson){
 const target=$("#h3ScheduleInsights");if(!target||!isAdmin)return;
 const dateKey=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
 const dayLabel=value=>new Date(value).toLocaleDateString("en-US",{timeZone:"America/Los_Angeles",weekday:"short",month:"short",day:"numeric"});
 const byDeadline=new Map();
 assignments.filter(a=>a.due_at&&a.assignee_id).forEach(a=>{const key=a.assignee_id+"|"+dateKey(a.due_at);if(!byDeadline.has(key))byDeadline.set(key,[]);byDeadline.get(key).push(a)});
 const deadlineConflicts=[...byDeadline.values()].filter(list=>list.length>1).map(list=>({name:members.find(m=>m.id===list[0].assignee_id)?.display_name||members.find(m=>m.id===list[0].assignee_id)?.email||"Contributor",date:list[0].due_at,items:list}));
 const timed=calendarRows.filter(e=>e.starts_at&&e.ends_at&&new Date(e.ends_at)>new Date(e.starts_at)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const overlaps=[];
 for(let i=0;i<timed.length;i++)for(let k=i+1;k<timed.length;k++){
  if(new Date(timed[k].starts_at)>=new Date(timed[i].ends_at))break;
  if(new Date(timed[k].starts_at)<new Date(timed[i].ends_at)&&new Date(timed[k].ends_at)>new Date(timed[i].starts_at))overlaps.push([timed[i],timed[k]]);
 }
 const guestDays=new Map();guestRows.filter(g=>!["completed","cancelled","declined"].includes(String(g.status||"").toLowerCase())).forEach(g=>{const key=dateKey(g.interview_at);if(!guestDays.has(key))guestDays.set(key,[]);guestDays.get(key).push(g)});
 const guestClusters=[...guestDays.entries()].filter(([,list])=>list.length>1);
 const unassigned=assignments.filter(a=>!a.assignee_id);
 const eligible=members.filter(m=>["contributor","producer","admin"].includes(String(m.role||"").toLowerCase()));
 const loadFor=id=>assignments.filter(a=>a.assignee_id===id).length;
 const suggestions=unassigned.slice(0,6).map(a=>{const candidate=[...eligible].sort((x,y)=>loadFor(x.id)-loadFor(y.id))[0];return {assignment:a,candidate}});
 const conflictCount=deadlineConflicts.length+overlaps.length+guestClusters.length;
 const conflictHtml=deadlineConflicts.map(x=>'<article class="h3-schedule-item conflict"><b>'+esc(x.name)+' · '+esc(dayLabel(x.date))+'</b><small>'+x.items.length+' open assignment deadlines fall on the same day</small><p>'+x.items.map(a=>esc(a.title)).join(" · ")+'</p></article>').join("")+
 overlaps.map(pair=>'<article class="h3-schedule-item conflict"><b>Calendar events overlap</b><small>'+esc(when(pair[0].starts_at))+' – '+esc(when(pair[0].ends_at))+'</small><p>'+esc(pair[0].title)+' ↔ '+esc(pair[1].title)+'</p></article>').join("")+
 guestClusters.map(([date,list])=>'<article class="h3-schedule-item watch"><b>Multiple guest interviews · '+esc(date)+'</b><small>'+list.length+' scheduled interviews on the same date; verify spacing manually</small><p>'+list.map(g=>esc(g.guest_name)).join(" · ")+'</p></article>').join("");
 const suggestionHtml=suggestions.map(x=>'<article class="h3-schedule-item"><b>'+esc(x.assignment.title)+'</b><small>Unassigned · '+esc(x.assignment.tn_production_episodes?.episode_number||"Episode")+'</small><p>'+(x.candidate?'Lowest current assignment count: <strong>'+esc(x.candidate.display_name||x.candidate.email||"Team member")+'</strong> ('+loadFor(x.candidate.id)+' open)':'No eligible production profiles found')+'</p></article>').join("");
 const upcoming=[...calendarRows.map(x=>({title:x.title,start:x.starts_at,kind:"Calendar"})),...guestRows.filter(x=>!["completed","cancelled","declined"].includes(String(x.status||"").toLowerCase())).map(x=>({title:"Guest: "+x.guest_name,start:x.interview_at,kind:"Guest"}))].sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,5);
 const scheduleHtml=upcoming.map(x=>'<article class="h3-schedule-item"><b>'+esc(x.title)+'</b><small>'+esc(x.kind)+' · '+esc(when(x.start))+'</small></article>').join("");
 target.innerHTML='<div class="h3-schedule-card"><span class="hub3-kicker">CONFLICT SCAN</span><b class="h3-schedule-number">'+conflictCount+'</b><small>Potential scheduling conflicts</small>'+(conflictHtml||'<p class="hub3-empty">No same-day deadline clusters or overlapping timed calendar events detected.</p>')+'</div><div class="h3-schedule-card"><span class="hub3-kicker">ASSIGNMENT MATCHING</span><b class="h3-schedule-number">'+unassigned.length+'</b><small>Open assignments without an owner</small>'+(suggestionHtml||'<p class="hub3-empty">No unassigned work needs a recommendation.</p>')+'<p class="h3-schedule-disclaimer">Suggestions use current open-assignment counts only. Confirm skills, availability and consent before assigning.</p></div><div class="h3-schedule-card"><span class="hub3-kicker">UPCOMING SCHEDULE</span><b class="h3-schedule-number">'+(calendarRows.length+guestRows.length)+'</b><small>Future events and guest sessions loaded</small>'+(scheduleHtml||'<p class="hub3-empty">No future calendar events or guest sessions are scheduled.</p>')+'</div>';
}


async function loadSmartAssignmentDesk(assignments){
 const target=$("#h3ScheduleInsights");if(!target||!isAdmin)return;
 const existing=$("#h3SmartAssignmentDesk");if(existing)existing.remove();
 const panel=document.createElement("section");panel.id="h3SmartAssignmentDesk";panel.className="h3-smart-assignment-card";
 panel.innerHTML='<div class="h3-smart-head"><div><span class="hub3-kicker">PRODUCTION HUB 10.0</span><h4>Smart assignment desk</h4><p class="hub3-small">Ranks approved contributors using declared interests, current workload, overdue work and recurring availability on the deadline weekday. Nothing is assigned or changed automatically.</p></div><span class="h3-smart-status">PRODUCER REVIEW</span></div><div class="h3-smart-content"><p class="hub3-empty">Building assignment recommendations…</p></div>';
 target.appendChild(panel);
 const content=panel.querySelector(".h3-smart-content");
 try{
  const [hosts,slots]=await Promise.all([
   rows("tacoma_nights_remote_hosts",db.from("tacoma_nights_remote_hosts").select("id,user_id,role,team_status,segment_interests").limit(300)),
   rows("tacoma_nights_host_availability",db.from("tacoma_nights_host_availability").select("host_id,weekday,timezone").limit(500))
  ]);
  const activeHosts=new Map(hosts.filter(h=>String(h.team_status||"").toLowerCase()==="active"&&h.user_id).map(h=>[h.user_id,h]));
  const eligible=members.filter(m=>["contributor","producer"].includes(String(m.role||"").toLowerCase()));
  const norm=v=>String(v||"").toLowerCase();
  const active=assignments.filter(a=>!["complete","completed","approved","published","done","cancelled"].includes(norm(a.status).replaceAll(" ","_")));
  if(!active.length){content.innerHTML='<p class="hub3-empty">No active assignments are available to rank yet. Once production tasks are added, this desk will compare contributor fit and workload.</p>';return}
  if(!eligible.length){content.innerHTML='<p class="hub3-empty">No approved contributor or producer profiles are available for matching yet. Pending applications and administrator accounts are intentionally excluded.</p>';return}
  const now=Date.now(),workload=new Map(eligible.map(m=>[m.id,{open:0,overdue:0}]));
  active.forEach(a=>{if(!a.assignee_id||!workload.has(a.assignee_id))return;const w=workload.get(a.assignee_id);w.open++;if(a.due_at&&new Date(a.due_at).getTime()<now)w.overdue++});
  const tags=["sports","community","teen","young adult","entertainment","business","culture","research","editing","producer","host","correspondent","interview","writing","social media","technology","music","film","television","real life","weekly lineup","people's perspective"];
  const weekdayIndex={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  const rankedAssignments=[...active].sort((a,b)=>{
   const urgency=x=>!x.due_at?3:(new Date(x.due_at).getTime()<now?0:new Date(x.due_at).getTime()<now+48*3600000?1:2);
   return urgency(a)-urgency(b)||(new Date(a.due_at||"9999-12-31")-new Date(b.due_at||"9999-12-31"));
  }).slice(0,8);
  content.innerHTML=rankedAssignments.map(a=>{
   const task=[a.title,a.instructions,a.tn_production_episodes?.title,a.tn_production_episodes?.topic].filter(Boolean).join(" ").toLowerCase();
   const dueDate=a.due_at?new Date(a.due_at):null;
   const candidates=eligible.map(m=>{
    const host=activeHosts.get(m.id);
    const profileText=[...(m.skills||[]),...(m.segment_interests||[]),m.requested_role,m.application_note,host?.segment_interests,host?.role].filter(Boolean).join(" ").toLowerCase();
    const matched=tags.filter(tag=>task.includes(tag)&&profileText.includes(tag));
    let available=null;
    if(host&&dueDate&&!Number.isNaN(dueDate.getTime())){
     const zone=(slots.find(s=>s.host_id===host.id)?.timezone)||"America/Los_Angeles";
     const dayName=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:zone}).format(dueDate);
     const day=weekdayIndex[dayName];
     available=slots.some(s=>s.host_id===host.id&&Number(s.weekday)===day);
    }
    const load=workload.get(m.id)||{open:0,overdue:0};
    const score=matched.length*10+(available===true?3:0)-load.open*2-load.overdue*4;
    const reasons=[];
    if(matched.length)reasons.push("Interest match: "+matched.slice(0,3).join(", "));
    if(available===true)reasons.push("Recurring availability listed that weekday");
    if(available===false)reasons.push("No recurring availability listed that weekday");
    if(available===null)reasons.push("Availability not on file");
    reasons.push(load.open+" open · "+load.overdue+" overdue");
    return {m,score,matched,available,load,reasons};
   }).sort((x,y)=>y.score-x.score||x.load.open-y.load.open||String(x.m.display_name||x.m.email).localeCompare(String(y.m.display_name||y.m.email)));
   const deadline=dueDate&&!Number.isNaN(dueDate.getTime())?when(a.due_at):"No deadline set";
   const urgency=dueDate&&dueDate.getTime()<now?"OVERDUE":dueDate&&dueDate.getTime()<now+48*3600000?"DUE SOON":"ACTIVE WORK";
   const rowsHtml=candidates.slice(0,3).map((c,i)=>{
    const isOwner=c.m.id===a.assignee_id,fit=c.matched.length?"Declared interest match":"Workload-based fallback";
    return '<div class="h3-smart-candidate"><div class="h3-smart-rank">#'+(i+1)+'</div><div class="h3-smart-candidate-main"><b>'+esc(c.m.display_name||c.m.email||"Contributor")+(isOwner?' <span class="h3-smart-owner">CURRENT OWNER</span>':"")+'</b><small>'+esc(fit)+' · '+c.load.open+' open · '+c.load.overdue+' overdue</small><p>'+esc(c.reasons.join(" · "))+'</p></div></div>';
   }).join("");
   return '<article class="h3-smart-assignment"><div class="h3-smart-task"><div><span class="hub3-kicker">'+urgency+'</span><b>'+esc(a.title)+'</b><small>'+esc(a.tn_production_episodes?.episode_number||"Episode")+' · '+esc(deadline)+'</small></div>'+status(a.status)+'</div><div class="h3-smart-candidates">'+rowsHtml+'</div></article>';
  }).join("");
  content.insertAdjacentHTML("beforeend",'<p class="h3-schedule-disclaimer">Matching is advisory. Profile interests may be incomplete; recurring weekday availability is only a rough signal because a deadline is not a scheduled work session. Confirm skills, capacity and consent with the contributor before changing an assignment.</p>');
 }catch(error){content.innerHTML='<p class="hub3-empty">Smart matching could not load: '+esc(error.message||"Please retry.")+'</p>'}
}


async function loadCapabilityManager(){
 const target=$("#h3ScheduleInsights");if(!target||!isAdmin)return;
 $("#h3CapabilityManager")?.remove();
 const skills=["Show hosting","Sports analysis","Community reporting","Teen perspective","Young adult perspective","Research","Writing","Editing","Interviews","Entertainment","Business coverage","Culture","Social media","Production coordination","Camera and audio","Live streaming","Graphic design","Podcasting","Film and television"];
 const interests=["Tacoma and Pierce County","Pacific Northwest","National news","Community","Sports","Entertainment","Real-life stories","Business","Culture","Teen and young adults","Music","Film and television","Technology","Education","Local events"];
 const panel=document.createElement("section");panel.id="h3CapabilityManager";panel.className="h3-capability-card";
 const memberOptions=members.filter(m=>["contributor","producer"].includes(String(m.role||"").toLowerCase())).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Contributor")+'</option>').join("");
 panel.innerHTML='<div class="h3-smart-head"><div><span class="hub3-kicker">PRODUCTION HUB 11.0</span><h4>Contributor skills & capabilities</h4><p class="hub3-small">Maintain each approved contributor’s strengths and preferred coverage areas. These tags improve assignment recommendations; they do not certify experience or replace a conversation with the contributor.</p></div><span class="h3-smart-status">ADMIN MANAGED</span></div><div class="h3-capability-controls"><label for="h3CapabilityMember">Contributor</label><select id="h3CapabilityMember">'+(memberOptions||'<option value="">No approved contributors or producers</option>')+'</select></div><div id="h3CapabilityEditor"></div><div class="h3-capability-actions"><button type="button" class="ph-btn primary" id="h3CapabilitySave" '+(memberOptions?"":"disabled")+'>Save capability profile</button><span id="h3CapabilityMessage" role="status" aria-live="polite"></span></div>';
 target.appendChild(panel);
 const memberSelect=panel.querySelector("#h3CapabilityMember"),editor=panel.querySelector("#h3CapabilityEditor");
 const group=(title,name,items,selected)=>'<fieldset class="h3-capability-group"><legend>'+title+'</legend><div class="h3-capability-options">'+items.map((item,i)=>'<label><input type="checkbox" name="'+name+'" value="'+esc(item)+'" '+(selected.includes(item)?"checked":"")+'><span>'+esc(item)+'</span></label>').join("")+'</div></fieldset>';
 const render=()=>{
  const m=members.find(x=>x.id===memberSelect.value);
  if(!m){editor.innerHTML='<p class="hub3-empty">No approved contributor profiles are available to manage yet. Pending applications and admin accounts are not included.</p>';return}
  editor.innerHTML=group("Skills & production capabilities","h3Skill",skills,m.skills||[])+group("Preferred segments & coverage","h3Interest",interests,m.segment_interests||[]);
 };
 memberSelect.addEventListener("change",render);render();
 panel.querySelector("#h3CapabilitySave").addEventListener("click",async()=>{
  const id=memberSelect.value;if(!id)return;
  const button=panel.querySelector("#h3CapabilitySave"),message=panel.querySelector("#h3CapabilityMessage");
  const values=name=>[...editor.querySelectorAll('input[name="'+name+'"]:checked')].map(x=>x.value);
  const update={skills:values("h3Skill"),segment_interests:values("h3Interest")};
  button.disabled=true;message.textContent="Saving…";
  try{
   const {error}=await db.from("tn_production_profiles").update(update).eq("id",id);
   if(error)throw error;
   const member=members.find(x=>x.id===id);if(member)Object.assign(member,update);
   message.textContent="Saved. Assignment recommendations will use these tags.";
   await loadSmartAssignmentDeskFromCurrent();
  }catch(error){message.textContent="Could not save: "+(error.message||"Please try again.");}
  finally{button.disabled=false}
 });
}
async function loadSmartAssignmentDeskFromCurrent(){
 const assignments=await rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,status,due_at,assignee_id,tn_production_episodes(episode_number,title,topic)").order("due_at").limit(300));
 await loadSmartAssignmentDesk(assignments);
}

async function loadCommand(){
 const [assignmentRows,uploadRows,editRows,researchRows,calendarRows,guestRows]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,status,due_at,assignee_id,tn_production_episodes(episode_number,title,topic)").order("due_at").limit(300)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,created_at,producer_note,uploader_id,tn_production_episodes(episode_number,title)").order("created_at",{ascending:false}).limit(200)),
  rows("tn_production_editing",db.from("tn_production_editing").select("id,status,editor_id,target_ready_at,tn_production_episodes(episode_number,title)").order("target_ready_at").limit(200)),
  rows("tn_production_research",db.from("tn_production_research").select("id,status").limit(200)),
  isAdmin?rows("tn_production_calendar",db.from("tn_production_calendar").select("id,title,starts_at,ends_at,event_type").gte("starts_at",new Date().toISOString()).order("starts_at").limit(250)):Promise.resolve([]),
  isAdmin?rows("tn_production_guests",db.from("tn_production_guests").select("id,guest_name,status,interview_at").not("interview_at","is",null).gte("interview_at",new Date().toISOString()).order("interview_at").limit(100)):Promise.resolve([])
 ]);
 const norm=v=>String(v||"").toLowerCase().replaceAll(" ","_");
 const done=a=>["complete","completed","approved","published","done","cancelled"].includes(norm(a.status));
 const activeEpisodes=episodes.filter(e=>!["published","archived","cancelled"].includes(norm(e.status)));
 const activeAssignments=assignmentRows.filter(a=>!done(a));
 const waitingUploads=uploadRows.filter(a=>["submitted","revision","revision_requested","pending_review"].includes(norm(a.status)));
 const reviewEdits=editRows.filter(a=>["review","producer_review","revisions"].includes(norm(a.status)));
 const activeEdits=editRows.filter(a=>!["approved","scheduled","published","complete","completed","cancelled"].includes(norm(a.status)));
 const readyResearch=researchRows.filter(a=>["ready","approved","complete","completed"].includes(norm(a.status)));
 const now=new Date(),todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),tomorrow=todayStart+86400000,soon=now.getTime()+48*3600000;
 const overdue=activeAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()<now.getTime());
 const dueToday=activeAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()>=todayStart&&new Date(a.due_at).getTime()<tomorrow);
 const dueSoon=activeAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()>=now.getTime()&&new Date(a.due_at).getTime()<=soon);
 set("h3CommandStats",[
  ["Active episodes",activeEpisodes.length],["Open assignments",activeAssignments.length],["Overdue",overdue.length],["Due today",dueToday.length],["Due in 48 hours",dueSoon.length],["Uploads to review",waitingUploads.length],["Active editing jobs",activeEdits.length],["Edits needing review",reviewEdits.length]
 ].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 const upcoming=activeEpisodes.filter(e=>e.premiere_at&&new Date(e.premiere_at).getTime()>=now.getTime()).sort((a,b)=>new Date(a.premiere_at)-new Date(b.premiere_at)).slice(0,6);
 set("h3EpisodeCommand",upcoming.map(e=>'<article class="hub3-row"><div><b>'+esc(e.episode_number)+' · '+esc(e.title)+'</b><p>'+esc(e.topic||"Topic to be confirmed")+'</p><small>Premiere: '+when(e.premiere_at)+'</small></div>'+status(e.status)+'</article>').join("")||'<p class="hub3-empty">No upcoming premieres are scheduled. Review the episode board to plan the next show.</p>');
 const upcomingAssignments=activeAssignments.filter(a=>a.due_at&&new Date(a.due_at).getTime()>=now.getTime()).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at)).slice(0,8);
 set("h3Timeline",upcomingAssignments.map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b><small>Due '+when(a.due_at)+'</small><small>'+esc(a.tn_production_episodes?.episode_number||"Episode")+' · '+esc(a.tn_production_episodes?.title||"")+'</small></div>').join("")||'<p class="hub3-empty">No future assignment deadlines are scheduled.</p>');
 const priorities=[
  ...overdue.map(a=>({rank:0,time:new Date(a.due_at).getTime(),title:a.title,kind:"OVERDUE ASSIGNMENT",meta:"Due "+when(a.due_at),episode:a.tn_production_episodes?.episode_number})),
  ...dueSoon.filter(a=>!overdue.includes(a)).map(a=>({rank:1,time:new Date(a.due_at).getTime(),title:a.title,kind:"DUE WITHIN 48 HOURS",meta:"Due "+when(a.due_at),episode:a.tn_production_episodes?.episode_number})),
  ...waitingUploads.map(a=>({rank:2,time:new Date(a.created_at).getTime(),title:a.title||"Untitled submission",kind:"SUBMISSION REVIEW",meta:"Submitted "+when(a.created_at),episode:a.tn_production_episodes?.episode_number})),
  ...reviewEdits.map(a=>({rank:3,time:a.target_ready_at?new Date(a.target_ready_at).getTime():now.getTime(),title:a.tn_production_episodes?.title||"Episode edit",kind:"EDIT NEEDS REVIEW",meta:"Target "+when(a.target_ready_at),episode:a.tn_production_episodes?.episode_number}))
 ].sort((a,b)=>a.rank-b.rank||(a.rank===2? a.time-b.time:b.time-a.time)).slice(0,14);
 set("h3NeedsAttention",priorities.map(x=>'<article class="hub3-priority-item priority-'+x.rank+'"><div><b>'+esc(x.title)+'</b><small>'+esc(x.kind)+(x.episode?" · "+esc(x.episode):"")+'</small><small>'+esc(x.meta)+'</small></div></article>').join("")||'<p class="hub3-empty">Nothing currently needs attention. New priorities will appear as assignments, submissions, and edit reviews arrive.</p>');
 if(isAdmin){
  const byPerson=new Map();
  activeAssignments.forEach(a=>{const id=a.assignee_id||"unassigned";if(!byPerson.has(id))byPerson.set(id,{total:0,overdue:0,dueSoon:0,name:id==="unassigned"?"Unassigned":(members.find(m=>m.id===id)?.display_name||members.find(m=>m.id===id)?.email||"Team member")});const x=byPerson.get(id);x.total++;if(a.due_at&&new Date(a.due_at).getTime()<now.getTime())x.overdue++;else if(a.due_at&&new Date(a.due_at).getTime()<=soon)x.dueSoon++});
  const workload=[...byPerson.values()].sort((a,b)=>b.overdue-a.overdue||b.total-a.total).slice(0,10);
  set("h3Workload",workload.map(x=>'<article class="hub3-workload-item"><div><b>'+esc(x.name)+'</b><small>'+x.total+' open assignment'+(x.total===1?"":"s")+'</small></div><span class="'+(x.overdue?"hub3-overdue":"")+'">'+x.overdue+' overdue</span><small>'+x.dueSoon+' due within 48h</small></article>').join("")||'<p class="hub3-empty">No active contributor assignments yet.</p>');
  renderScheduleIntelligence(activeAssignments,calendarRows,guestRows,byPerson);
  await loadSmartAssignmentDesk(activeAssignments);
  await loadCapabilityManager();
  await loadHostAvailability();
 }else set("h3Workload",'<p class="hub3-empty">Team workload is available to producers and administrators.</p>');
}
async function loadContributor(){
 const [assignments,uploads,notifications]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,status,due_at,tn_production_episodes(episode_number,title)").eq("assignee_id",user.id).order("due_at").limit(100)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,producer_note,created_at,reviewed_at").eq("uploader_id",user.id).order("created_at",{ascending:false}).limit(100)),
  rows("tn_notifications",db.from("tn_notifications").select("id,title,message,created_at,read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(8))
 ]);
 const now=Date.now(), day=86400000, norm=v=>String(v||"").toLowerCase();
 const requestSelect=$("#h3RequestAssignment");if(requestSelect){const active=assignments.filter(a=>!["complete","cancelled"].includes(norm(a.status)));requestSelect.innerHTML='<option value="">Choose an open assignment…</option>'+active.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.title)+' · '+esc(a.tn_production_episodes?.episode_number||"Episode")+'</option>').join("")}

 const open=assignments.filter(a=>!["complete","cancelled"].includes(norm(a.status)));
 const completed=assignments.filter(a=>norm(a.status)==="complete").length;
 const overdue=open.filter(a=>a.due_at&&new Date(a.due_at).getTime()<now);
 const dueSoon=open.filter(a=>a.due_at&&new Date(a.due_at).getTime()>=now&&new Date(a.due_at).getTime()<=now+7*day);
 const unread=notifications.filter(n=>!n.read_at).length;
 const approved=uploads.filter(x=>norm(x.status)==="approved").length;
 const revisions=uploads.filter(x=>norm(x.status)==="revision").length;
 const rejected=uploads.filter(x=>norm(x.status)==="rejected").length;
 const pending=uploads.filter(x=>norm(x.status)==="submitted").length;
 const reviewed=approved+revisions+rejected, approvalRate=reviewed?Math.round(approved/reviewed*100):0;
 const completionRate=assignments.length?Math.round(completed/assignments.length*100):0;
 try{await syncAssignmentReminders(assignments);await loadNotifications()}catch(error){console.warn("Deadline reminder sync failed",error)}
 set("h3ContributorStats",[
  ["Open assignments",open.length],["Due in 7 days",dueSoon.length],["Overdue",overdue.length],["Unread updates",unread],["Uploads awaiting review",pending]
 ].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 set("h3ContributorPerformance",'<div class="h3-contributor-performance"><div class="h3-performance-head"><div><span class="hub3-kicker">YOUR CONTRIBUTION SNAPSHOT</span><h4>Work completed & reviewed</h4></div><span class="h3-performance-updated">Based on your production records</span></div><div class="h3-performance-grid"><div><b>'+completed+'</b><span>Assignments completed</span></div><div><b>'+uploads.length+'</b><span>Segments submitted</span></div><div><b>'+approved+'</b><span>Segments approved</span></div><div><b>'+revisions+'</b><span>Revisions requested</span></div><div><b>'+pending+'</b><span>Awaiting review</span></div><div><b>'+approvalRate+'%</b><span>Approval rate of reviewed uploads</span></div></div><div class="h3-progress-row"><div><span>Assignment completion</span><b>'+completionRate+'%</b></div><div class="h3-progress-track"><span style="width:'+completionRate+'%"></span></div></div><p class="h3-performance-foot">'+(reviewed?approved+' approved out of '+reviewed+' reviewed submission'+(reviewed===1?"":"s")+'.':'Your approval rate will appear after a producer reviews a submission.')+' '+(assignments.length?completed+' of '+assignments.length+' assigned tasks marked complete.':'Your task history will appear when assignments are added.')+'</p></div>');
 const next=open.filter(a=>a.due_at).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at))[0]||open[0];
 set("h3ContributorNext",next?'<div class="hub3-next-deadline"><span class="hub3-kicker">'+(next.due_at?'NEXT DEADLINE':'CURRENT ASSIGNMENT')+'</span><b>'+esc(next.title)+'</b><p>'+esc(next.tn_production_episodes?.episode_number||"Episode")+' · '+esc(next.tn_production_episodes?.title||"")+'</p><small>'+(next.due_at?when(next.due_at):'Due date not set')+'</small></div>':'<p class="hub3-empty">No open assignments. You are caught up — check back when your producer posts the next segment.</p>');
 set("h3MyAssignments",assignments.map(a=>{
  const late=a.due_at&&new Date(a.due_at).getTime()<now&&!["complete","cancelled"].includes(norm(a.status));
  const tasks=["Review assignment instructions","Research and prepare your segment","Record / create your contribution","Upload and check your submission"];
  let checked={};try{checked=JSON.parse(localStorage.getItem("tn-assignment-checklist-"+a.id)||"{}")}catch{}
  const done=tasks.filter((_,i)=>checked[i]).length;
  const checklist='<details class="h3-assignment-checklist"><summary>Assignment checklist · '+done+'/'+tasks.length+' complete</summary><div class="h3-checklist-items">'+tasks.map((task,i)=>'<label><input type="checkbox" data-h3-checklist="'+esc(a.id)+'" data-check-index="'+i+'" '+(checked[i]?'checked':'')+'> <span>'+task+'</span></label>').join("")+'</div></details>';
  return '<article class="hub3-row h3-assignment-card" data-assignment-card="'+esc(a.id)+'"><div><b>'+esc(a.title)+'</b><p>'+esc(a.tn_production_episodes?.episode_number||"Episode")+" · "+esc(a.tn_production_episodes?.title||"")+'</p><p>'+esc(a.instructions||"No additional instructions.")+'</p><small class="'+(late?"hub3-overdue":"")+'">'+(a.due_at?'Due '+when(a.due_at):'No due date set')+(late?" · OVERDUE":"")+'</small>'+checklist+'</div>'+status(a.status)+'</article>';
 }).join("")||'<p class="hub3-empty">You do not have any assignments yet. Your producer will post your segment and deadline here.</p>');
 set("h3MyUploads",uploads.slice(0,20).map(a=>{
  const needsRevision=norm(a.status)==="revision";
  const button=needsRevision?'<button type="button" class="ph-btn h3-resubmit-btn" data-h3-resubmit="'+esc(a.id)+'" data-episode="'+esc(a.episode_id||"")+'" data-title="'+esc(a.title||"")+'" data-feedback="'+esc(a.producer_note||"")+'">Prepare revised submission</button>':"";
  return '<div class="hub3-mini h3-upload-history"><b>'+esc(a.title)+'</b>'+status(a.status)+(a.producer_note?'<small class="hub3-producer-note">Producer feedback: '+esc(a.producer_note)+'</small>':"")+'<small>Submitted '+when(a.created_at)+(a.reviewed_at?' · Reviewed '+when(a.reviewed_at):'')+'</small>'+button+'</div>';
 }).join("")||'<p class="hub3-empty">Your uploaded segments and producer feedback will appear here.</p>');
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
let calendarEvents=[],calendarCursor=new Date();
function calendarDate(value,opts={}){if(!value)return "Date to be confirmed";return new Date(value).toLocaleString("en-US",{timeZone:"America/Los_Angeles",...opts})}
function calendarKey(date){const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return v.year+"-"+v.month+"-"+v.day}
function renderCalendar(){
 const type=$("#h3CalendarType")?.value||"all",view=$("#h3CalendarRange")?.value||"month",y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0);
 const ws=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),calendarCursor.getDate());ws.setDate(ws.getDate()-((ws.getDay()+6)%7));const we=new Date(ws);we.setDate(we.getDate()+6);
 const lo=view==="week"?ws:first,hi=view==="week"?we:last,filtered=calendarEvents.filter(x=>(type==="all"||x.type===type)&&calendarKey(new Date(x.start))>=calendarKey(lo)&&calendarKey(new Date(x.start))<=calendarKey(hi));
 const n=k=>filtered.filter(x=>x.type===k).length;
 set("h3CalendarStats",[['Scheduled',filtered.length],['Deadlines',n("deadline")],['Premieres',n("premiere")],['Editing',n("editing")],['Submissions',n("submission")]].map(([l,v])=>'<div class="hub3-calendar-stat"><b>'+v+'</b><span>'+l+'</span></div>').join(""));
 const label=$("#h3CalendarPeriod");if(label)label.textContent=view==="week"?calendarDate(ws,{month:"short",day:"numeric"})+" – "+calendarDate(we,{month:"short",day:"numeric",year:"numeric"}):calendarDate(first,{month:"long",year:"numeric"});
 const map=new Map();filtered.forEach(x=>{const k=calendarKey(new Date(x.start));if(!map.has(k))map.set(k,[]);map.get(k).push(x)});
 const event=x=>'<div class="hub3-month-event event-'+esc(x.type)+'" title="'+esc(x.title)+'">'+(x.allDay?"":esc(calendarDate(x.start,{hour:"numeric",minute:"2-digit"})+" · "))+esc(x.title)+'</div>';
 if(view==="agenda"){set("h3CalendarList",filtered.length?filtered.map(x=>'<section class="hub3-calendar-day"><h4>'+esc(calendarDate(x.start,{weekday:"long",month:"long",day:"numeric",year:"numeric"}))+'</h4><article class="hub3-calendar-event"><b>'+esc(x.title)+'</b><p>'+esc(x.description||"")+'</p><small>'+esc(x.source)+" · "+esc(calendarDate(x.start,{hour:"numeric",minute:"2-digit"}))+'</small></article></section>').join(""):'<p class="hub3-empty">No scheduled items in this period.</p>');return}
 const begin=view==="week"?ws:new Date(y,m,1-((first.getDay()+6)%7)),total=view==="week"?7:42,heads=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];let out='<div class="hub3-month-grid">'+heads.map(x=>'<div class="hub3-month-weekday">'+x+'</div>').join("");
 for(let i=0;i<total;i++){const d=new Date(begin);d.setDate(begin.getDate()+i);const k=calendarKey(d),items=map.get(k)||[];out+='<section class="hub3-month-day '+(view==="month"&&d.getMonth()!==m?"is-outside ":"")+(k===calendarKey(new Date())?"is-today":"")+'"><b class="hub3-month-day-number">'+d.getDate()+'</b><div class="hub3-month-day-events">'+items.slice(0,4).map(event).join("")+(items.length>4?"<small>+"+(items.length-4)+" more</small>":"")+'</div></section>'}
 set("h3CalendarList",out+'</div>');
}
async function loadCalendar(){
 const from=new Date(Date.now()-180*86400000).toISOString();
 const [saved,assignments,guests,editing,uploads]=await Promise.all([
 rows("tn_production_calendar",db.from("tn_production_calendar").select("id,title,description,event_type,starts_at,ends_at,all_day").gte("starts_at",from).order("starts_at").limit(250)),
 rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,due_at,status,episode_id").not("due_at","is",null).gte("due_at",from).order("due_at").limit(250)),
 isAdmin?rows("tn_production_guests",db.from("tn_production_guests").select("id,guest_name,topic,status,interview_at").not("interview_at","is",null).gte("interview_at",from).order("interview_at").limit(100)):Promise.resolve([]),
 rows("tn_production_editing",db.from("tn_production_editing").select("id,status,target_ready_at,episode_id").not("target_ready_at","is",null).gte("target_ready_at",from).order("target_ready_at").limit(150)),
 rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,created_at,episode_id").gte("created_at",from).order("created_at",{ascending:false}).limit(150))
 ]);
 const items=saved.map(x=>({id:"event-"+x.id,title:x.title,description:x.description,type:x.event_type,start:x.starts_at,end:x.ends_at,allDay:x.all_day,source:"Production event"}));
 episodes.filter(x=>x.premiere_at&&new Date(x.premiere_at).getTime()>=Date.now()-45*86400000).forEach(x=>items.push({id:"episode-"+x.id,title:(x.episode_number?x.episode_number+" · ":"")+x.title,description:x.topic||"Episode premiere",type:"premiere",start:x.premiere_at,source:"Episode schedule"}));
 assignments.filter(x=>!["complete","completed","approved","cancelled"].includes(String(x.status||"").toLowerCase())).forEach(x=>{const ep=episodes.find(e=>e.id===x.episode_id);items.push({id:"assignment-"+x.id,title:x.title,description:x.instructions||"",type:"deadline",start:x.due_at,source:"Contributor deadline"+(ep?" · "+ep.episode_number+" "+ep.title:"")})});
 editing.filter(x=>!["approved","scheduled","published","complete","completed","cancelled"].includes(String(x.status||"").toLowerCase())).forEach(x=>{const ep=episodes.find(e=>e.id===x.episode_id);items.push({id:"edit-"+x.id,title:"Edit ready: "+(ep?.title||"Episode"),description:"Stage: "+String(x.status||"not set").replaceAll("_"," "),type:"editing",start:x.target_ready_at,source:"Editing target"+(ep?" · "+ep.episode_number:"")})});
 uploads.forEach(x=>{const ep=episodes.find(e=>e.id===x.episode_id);items.push({id:"upload-"+x.id,title:"Segment submitted: "+(x.title||"Untitled"),description:"Status: "+String(x.status||"pending").replaceAll("_"," "),type:"submission",start:x.created_at,source:"Contributor upload"+(ep?" · "+ep.episode_number:"")})});
 guests.filter(x=>!["completed","cancelled","declined"].includes(String(x.status||"").toLowerCase())).forEach(x=>items.push({id:"guest-"+x.id,title:"Guest: "+x.guest_name,description:x.topic||"Guest interview",type:"guest",start:x.interview_at,source:"Guest booking"}));
 calendarEvents=items.filter(x=>x.start).sort((x,y)=>new Date(x.start)-new Date(y.start));renderCalendar();
}
let researchRows=[],researchSearch="",researchStatusFilter="all",researchCategoryFilter="all";
function renderResearch(){
 const filtered=researchRows.filter(x=>{const hay=[x.title,x.category,x.summary,x.source_name,x.notes,x.tn_production_episodes?.title].join(" ").toLowerCase();return (!researchSearch||hay.includes(researchSearch))&&(researchStatusFilter==="all"||x.status===researchStatusFilter)&&(researchCategoryFilter==="all"||x.category===researchCategoryFilter)});
 const stats=[["Research items",researchRows.length],["Ideas",researchRows.filter(x=>x.status==="idea").length],["In research",researchRows.filter(x=>x.status==="researching").length],["Ready for production",researchRows.filter(x=>x.status==="ready").length]];
 set("h3ResearchStats",stats.map(([l,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+l+'</span></div>').join(""));
 set("h3ResearchResultCount",filtered.length+" of "+researchRows.length+" research items");
 const cats=Array.from(new Set(researchRows.map(x=>x.category).filter(Boolean))).sort(),catFilter=$("#h3ResearchCategoryFilter");if(catFilter){const value=researchCategoryFilter;catFilter.innerHTML='<option value="all">All categories</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");catFilter.value=value}
 const membersById=new Map(members.map(m=>[m.id,m.display_name||m.email||"Team member"]));
 set("h3ResearchList",filtered.map(x=>{const ep=x.tn_production_episodes,source=safeHttps(x.source_url),assigned=membersById.get(x.assigned_to)||"Unassigned";
 return '<article class="hub3-research-card"><div class="hub3-research-top"><div><span class="hub3-kicker">'+esc(x.category||"General")+'</span><h4>'+esc(x.title)+'</h4><p>'+esc(ep?(ep.episode_number?ep.episode_number+" · ":"")+ep.title:"General research / idea vault")+' · Added '+when(x.created_at)+'</p></div><span class="hub3-research-stage '+esc(x.status)+'">'+esc((x.status||"idea").replaceAll("_"," "))+'</span></div><p class="hub3-research-summary">'+esc(x.summary)+'</p><div class="hub3-research-source"><span><b>Source</b>'+esc(x.source_name||"Not named")+'</span>'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Open source ↗</a>':'<span>No source URL attached</span>')+'</div><p class="hub3-research-owner"><b>Assigned to:</b> '+esc(assigned)+'</p>'+(isAdmin?'<details class="hub3-research-edit"><summary>Producer review & story development</summary><div class="hub3-research-edit-grid"><label>Workflow status<select data-research-field="status" data-research-id="'+esc(x.id)+'"><option value="idea" '+(x.status==="idea"?"selected":"")+'>Idea</option><option value="researching" '+(x.status==="researching"?"selected":"")+'>Researching</option><option value="ready" '+(x.status==="ready"?"selected":"")+'>Ready for production</option><option value="archived" '+(x.status==="archived"?"selected":"")+'>Archived</option></select></label><label>Research owner<select data-research-field="assigned_to" data-research-id="'+esc(x.id)+'"><option value="">Unassigned</option>'+members.map(m=>'<option value="'+esc(m.id)+'" '+(x.assigned_to===m.id?"selected":"")+'>'+esc(m.display_name||m.email||"Team member")+'</option>').join("")+'</select></label><label class="wide">Fact-check notes / producer context<textarea data-research-field="notes" data-research-id="'+esc(x.id)+'" rows="3">'+esc(x.notes||"")+'</textarea></label><button type="button" class="ph-btn primary" data-h3-research-save="'+esc(x.id)+'">Save research review</button></div></details>':(x.notes?'<p class="hub3-research-notes"><b>Producer notes:</b> '+esc(x.notes)+'</p>':""))+'</article>';
 }).join("")||'<p class="hub3-empty">'+(researchRows.length?"No research items match these filters.":"The research desk is ready for its first source or story brief.")+'</p>');
}
async function loadResearch(){
 researchRows=await rows("tn_production_research",db.from("tn_production_research").select("id,episode_id,title,category,summary,source_url,source_name,assigned_to,created_by,status,notes,created_at,tn_production_episodes(episode_number,title)").order("created_at",{ascending:false}).limit(250));
 renderResearch();
}
function renderNotifications(){
 const unread=notificationRows.filter(x=>!x.read_at).length;
 set("h3NotificationSummary",'<div class="hub3-notice-count"><b>'+unread+'</b><span>unread notifications</span><small>'+notificationRows.length+' recent messages</small></div>');
 const list=notificationRows.filter(x=>notificationFilter==="unread"?!x.read_at:notificationFilter==="deadlines"?/deadline|due|overdue/i.test((x.title||"")+" "+(x.message||"")):notificationFilter==="reviews"?/awaiting review|review desk|revisions requested/i.test((x.title||"")+" "+(x.message||"")):true);
 set("h3NotificationList",list.map(x=>'<article class="hub3-row '+(x.read_at?"":"unread")+'"><div><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+when(x.created_at)+'</small>'+(safeHttps(x.href)?'<p><a href="'+esc(safeHttps(x.href))+'">Open related item ↗</a></p>':"")+'</div>'+(x.read_at?status("read"):'<button class="ph-btn" data-h3-read="'+esc(x.id)+'">Mark read</button>')+'</article>').join("")||'<p class="hub3-empty">'+(notificationFilter==="unread"?"You have no unread notifications.":notificationFilter==="deadlines"?"No deadline reminders yet.":notificationFilter==="reviews"?"No submission-review alerts right now.":"You are all caught up. New production notifications will appear here.")+'</p>');
 document.querySelectorAll("[data-h3-notification-filter]").forEach(b=>b.classList.toggle("active",b.dataset.h3NotificationFilter===notificationFilter));
 const all=document.querySelector("[data-h3-read-all]");if(all)all.disabled=unread===0;
}
async function loadNotifications(){
 notificationRows=await rows("tn_notifications",db.from("tn_notifications").select("id,title,message,href,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100));
 renderNotifications();if(typeof renderCommunication==="function")renderCommunication();
}
async function createDedupedNotifications(candidates){
 if(!candidates.length)return;
 const hrefs=candidates.map(x=>x.href).filter(Boolean);
 const existing=hrefs.length?await rows("tn_notifications",db.from("tn_notifications").select("href").eq("user_id",user.id).in("href",hrefs)):[];
 const seen=new Set(existing.map(x=>x.href)),fresh=candidates.filter(x=>!seen.has(x.href));
 if(!fresh.length)return;
 const {error}=await db.from("tn_notifications").insert(fresh);
 if(error)throw error;
}
async function syncAssignmentReminders(assignments){
 const now=Date.now(),soon=now+48*60*60*1000,day=now+24*60*60*1000,base="https://crowrulesentertainment-oss.github.io/tacomanights/production/";
 const open=assignments.filter(a=>a.due_at&&!["complete","completed","approved","cancelled"].includes(String(a.status||"").toLowerCase()));
 const candidates=[];
 for(const a of open){
  const due=new Date(a.due_at).getTime(),overdue=due<now;
  let kind,title,message;
  if(overdue){kind="overdue";title="Assignment overdue";message=" is past its deadline. Please update your producer."}
  else if(due<=day){kind="due-24h";title="Deadline within 24 hours";message=" is due within 24 hours. Please submit your segment or contact your producer."}
  else if(due<=soon){kind="due-48h";title="Deadline approaching";message=" is due within 48 hours. Please plan your submission."}
  else continue;
  const ep=a.tn_production_episodes;
  candidates.push({user_id:user.id,title,message:(a.title||"Your production assignment")+(ep?.episode_number?" · "+ep.episode_number:"")+message,href:base+"?reminder="+kind+"&assignment="+encodeURIComponent(a.id)});
 }
 try{await createDedupedNotifications(candidates)}catch(error){console.warn("Assignment reminders could not be created",error.message)}
}
let guestRows=[],guestSearch="",guestStatusFilter="all";
function renderGuests(){
 const q=guestSearch,filtered=guestRows.filter(x=>{const hay=[x.guest_name,x.email,x.phone,x.organization,x.topic,x.notes,x.tn_production_episodes?.title,x.tn_production_episodes?.episode_number].join(" ").toLowerCase();return (!q||hay.includes(q))&&(guestStatusFilter==="all"||x.status===guestStatusFilter)});
 const now=Date.now(),upcoming=guestRows.filter(x=>x.interview_at&&new Date(x.interview_at).getTime()>=now&&!["cancelled","declined","completed"].includes(x.status));
 set("h3GuestStats",[["All bookings",guestRows.length],["Awaiting response",guestRows.filter(x=>["prospect","invited"].includes(x.status)).length],["Confirmed",guestRows.filter(x=>["confirmed","scheduled"].includes(x.status)).length],["Upcoming interviews",upcoming.length],["Completed",guestRows.filter(x=>x.status==="completed").length]].map(([l,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+l+'</span></div>').join(""));
 set("h3GuestResultCount",filtered.length+" of "+guestRows.length+" guest records");
 const statuses=["prospect","invited","confirmed","scheduled","completed","declined","cancelled"];
 set("h3GuestList",filtered.map(x=>{const ep=x.tn_production_episodes,meeting=safeHttps(x.meeting_url),availability=typeof x.availability==="string"?x.availability:JSON.stringify(x.availability||{},null,2),dateValue=x.interview_at?new Date(new Date(x.interview_at).getTime()-new Date(x.interview_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
 return '<article class="hub3-guest-card"><div class="hub3-guest-head"><div><span class="hub3-kicker">'+esc((x.status||"prospect").replaceAll("_"," "))+'</span><h4>'+esc(x.guest_name)+'</h4><p>'+esc(x.organization||"Independent guest")+' · '+esc(x.email||"No email provided")+(x.phone?" · "+esc(x.phone):"")+'</p></div><label class="hub3-guest-status">Booking status<select data-h3-guest-status="'+esc(x.id)+'">'+statuses.map(s=>'<option value="'+s+'" '+(x.status===s?"selected":"")+'>'+s.replaceAll("_"," ")+'</option>').join("")+'</select></label></div><div class="hub3-guest-meta"><span><b>Episode</b>'+(ep?esc((ep.episode_number?ep.episode_number+" · ":"")+ep.title):"Not assigned")+'</span><span><b>Interview</b>'+when(x.interview_at)+'</span><span><b>Topic</b>'+esc(x.topic||"To be confirmed")+'</span></div>'+(meeting?'<p><a href="'+esc(meeting)+'" target="_blank" rel="noopener noreferrer">Open meeting link ↗</a></p>':"")+'<details class="hub3-guest-edit"><summary>Update booking details</summary><div class="hub3-guest-edit-grid"><label>Phone<input type="tel" data-guest-field="phone" value="'+esc(x.phone||"")+'"></label><label>Interview date & time<input type="datetime-local" data-guest-field="interview_at" value="'+esc(dateValue)+'"></label><label class="wide">Meeting link<input type="url" data-guest-field="meeting_url" value="'+esc(x.meeting_url||"")+'" placeholder="https://…"></label><label class="wide">Producer notes<textarea data-guest-field="notes" rows="2">'+esc(x.notes||"")+'</textarea></label><label class="wide">Guest availability (JSON)<textarea data-guest-field="availability" rows="2">'+esc(availability)+'</textarea></label><button type="button" class="ph-btn primary" data-h3-guest-save="'+esc(x.id)+'">Save booking details</button></div></details></article>';
 }).join("")||'<p class="hub3-empty">'+(guestRows.length?"No guests match your search or status filter.":"No guest bookings yet. Add your first guest.")+'</p>');
}
async function loadGuests(){
 if(!isAdmin){set("h3GuestList",'<p class="hub3-empty">Guest contact details are restricted to producers and administrators.</p>');return}
 guestRows=await rows("tn_production_guests",db.from("tn_production_guests").select("id,episode_id,guest_name,email,phone,organization,topic,notes,availability,status,interview_at,meeting_url,created_at,tn_production_episodes(episode_number,title)").order("created_at",{ascending:false}).limit(250));
 renderGuests();
}
let chatRows=[],teamUpdateRows=[],chatSearch="",chatFilter="all";
function renderCommunication(){
 const q=chatSearch;
 const messages=chatRows.filter(x=>!q||[x.display_name,x.message].some(v=>String(v||"").toLowerCase().includes(q)));
 const updates=teamUpdateRows.filter(x=>!q||[x.title,x.body,x.category].some(v=>String(v||"").toLowerCase().includes(q)));
 const unread=notificationRows.filter(x=>!x.read_at).length;
 set("h3CommunicationStats",[["Team messages",chatRows.length],["Announcements",teamUpdateRows.length],["Unread notifications",unread]].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 const showMessages=chatFilter!=="announcements",showUpdates=chatFilter!=="messages";
 let messageHtml="",announcementHtml="";
 if(showMessages)messageHtml=messages.map(x=>'<article class="hub3-chat-message '+(x.user_id===user.id?"mine":"")+'"><div class="hub3-chat-meta"><b>'+esc(x.display_name||"Team member")+'</b><time>'+when(x.created_at)+'</time></div><p>'+esc(x.message)+'</p></article>').join("")||'<p class="hub3-empty">'+(chatRows.length?"No messages match your search.":"No team messages yet. Start the conversation.")+'</p>';
 if(showUpdates)announcementHtml=updates.map(x=>'<article class="hub3-mini"><b>'+esc(x.title)+'</b><small>'+when(x.published_at)+'</small><p>'+esc(x.body)+'</p></article>').join("")||'<p class="hub3-empty">'+(teamUpdateRows.length?"No announcements match your search.":"No team announcements have been posted yet.")+'</p>';
 set("h3ChatMessages",messageHtml);set("h3Announcements",announcementHtml);
 const filter=$("#h3CommunicationFilter");if(filter)filter.value=chatFilter;
}
async function loadChat(){
 const [messages,updates]=await Promise.all([
  rows("tn_production_chat_messages",db.from("tn_production_chat_messages").select("id,display_name,message,created_at,user_id").order("created_at",{ascending:false}).limit(100)),
  rows("tn_production_updates",db.from("tn_production_updates").select("id,title,body,category,published_at").eq("visibility","team").order("published_at",{ascending:false}).limit(30))
 ]);
 chatRows=messages;teamUpdateRows=updates;renderCommunication();
}
let trainingRows=[],trainingProgressRows=[],trainingSearch="",trainingCategory="all";
function renderTraining(){
 const ownDone=new Set(trainingProgressRows.filter(x=>x.user_id===user.id).map(x=>x.resource_id));
 const filtered=trainingRows.filter(x=>{
  const hay=[x.title,x.category,x.description,x.content].join(" ").toLowerCase();
  return (!trainingSearch||hay.includes(trainingSearch))&&(trainingCategory==="all"||x.category===trainingCategory);
 });
 const total=trainingRows.length,completed=trainingRows.filter(x=>ownDone.has(x.id)).length;
 const percent=total?Math.round(completed/total*100):0;
 const categories=[...new Set(trainingRows.map(x=>x.category))].sort();
 const categorySelect=$("#h3TrainingCategory");
 if(categorySelect){
  const previous=trainingCategory;
  categorySelect.innerHTML='<option value="all">All learning paths</option>'+categories.map(x=>'<option value="'+esc(x)+'">'+esc(x.replaceAll("_"," "))+'</option>').join("");
  categorySelect.value=categories.includes(previous)||previous==="all"?previous:"all";
 }
 set("h3TrainingStats",[
  ["Published lessons",total],
  ["Completed by you",completed],
  ["Still to complete",Math.max(0,total-completed)],
  ["Your progress",percent+"%"]
 ].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 const teamProgress=trainingProgressRows.length;
 const teamMembers=new Set(trainingProgressRows.map(x=>x.user_id)).size;
 set("h3TrainingTeamSummary",isAdmin?'<div class="hub3-training-team-summary"><b>TEAM LEARNING ACTIVITY</b><span>'+teamProgress+' recorded lesson completions across '+teamMembers+' team member'+(teamMembers===1?"":"s")+'.</span></div>':"");
 const progressEl=$("#h3TrainingProgress");
 if(progressEl)progressEl.innerHTML='<div class="hub3-training-progress-head"><b>Your learning path</b><span>'+completed+' / '+total+' lessons · '+percent+'%</span></div><div class="hub3-training-progress-track"><span style="width:'+percent+'%"></span></div>';
 set("h3TrainingResultCount",filtered.length+" of "+total+" lessons shown");
 set("h3TrainingList",filtered.map((x,i)=>{
  const done=ownDone.has(x.id),url=safeHttps(x.resource_url);
  return '<article class="hub3-training-card '+(done?"is-complete":"")+'"><div class="hub3-training-card-index">'+String(trainingRows.indexOf(x)+1).padStart(2,"0")+'</div><div class="hub3-training-card-body"><div class="hub3-training-card-meta"><span>'+esc(x.category.replaceAll("_"," "))+'</span>'+(done?'<span class="hub3-training-complete-label">COMPLETED</span>':'<span>LESSON '+(i+1)+'</span>')+'</div><h4>'+esc(x.title)+'</h4><p>'+esc(x.description)+'</p>'+(x.content?'<details class="hub3-training-details"><summary>Read lesson instructions</summary><div>'+esc(x.content)+'</div></details>':"")+(url?'<a class="hub3-training-resource" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open learning resource ↗</a>':"")+'</div><div class="hub3-training-card-action">'+(done?'<span class="hub3-training-done">✓ Completed</span>':'<button class="ph-btn" data-h3-complete="'+esc(x.id)+'">Mark complete</button>')+'</div></article>';
 }).join("")||'<p class="hub3-empty">'+(total?"No lessons match your search or category.":"Your training library is ready. Producers can publish onboarding guides and learning resources here.")+'</p>');
}
async function loadTraining(){
 const progressQuery=db.from("tn_production_training_progress").select("resource_id,user_id,completed_at");
 const [list,progress]=await Promise.all([
  rows("tn_production_training",db.from("tn_production_training").select("id,title,category,description,resource_url,content,sort_order").eq("is_published",true).order("sort_order").order("created_at")),
  rows("tn_production_training_progress",isAdmin?progressQuery:progressQuery.eq("user_id",user.id))
 ]);
 trainingRows=list;trainingProgressRows=progress;renderTraining();
}
async function loadAnalytics(){
 if(!isAdmin){set("h3AnalyticsStats",'<p class="hub3-empty">Production analytics are restricted to producers and administrators.</p>');set("h3AnalyticsBreakdown","");return}
 const [assignmentRows,uploadRows,editRows,activityRows,guestTotal,feedbackTotal]=await Promise.all([
  rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,status,due_at,assignee_id,created_at").order("created_at",{ascending:false}).limit(500)),
  rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,uploader_id,created_at,reviewed_at").order("created_at",{ascending:false}).limit(500)),
  rows("tn_production_editing",db.from("tn_production_editing").select("id,status,editor_id,created_at,updated_at,approved_at").order("updated_at",{ascending:false}).limit(300)),
  rows("tn_production_activity",db.from("tn_production_activity").select("id,actor_id,action,detail,created_at").order("created_at",{ascending:false}).limit(100)),
  count("tn_production_guests"),count("tn_production_feedback"),
  rows("tn_production_recognition",db.from("tn_production_recognition").select("id,recipient_id,recipient_name,awarded_at").order("awarded_at",{ascending:false}).limit(500))
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
 const perfMap=new Map();
 members.filter(m=>["contributor","producer"].includes(norm(m.role))).forEach(m=>perfMap.set(m.id,{name:m.display_name||"Team contributor",role:m.role,assigned:0,completed:0,open:0,overdue:0,uploads:0,approved:0,reviewed:0,awards:0}));
 assignmentRows.forEach(a=>{if(!a.assignee_id)return;const p=perfMap.get(a.assignee_id)||{name:memberName(a.assignee_id),role:"team member",assigned:0,completed:0,open:0,overdue:0,uploads:0,approved:0,reviewed:0,awards:0};p.assigned++;if(done(a))p.completed++;else if(!["cancelled","rejected"].includes(norm(a.status))){p.open++;if(a.due_at&&new Date(a.due_at).getTime()<Date.now())p.overdue++}perfMap.set(a.assignee_id,p)});
 uploadRows.forEach(u=>{if(!u.uploader_id)return;const p=perfMap.get(u.uploader_id)||{name:memberName(u.uploader_id),role:"team member",assigned:0,completed:0,open:0,overdue:0,uploads:0,approved:0,reviewed:0,awards:0};p.uploads++;if(norm(u.status)==="approved")p.approved++;if(u.reviewed_at)p.reviewed++;perfMap.set(u.uploader_id,p)});
 recognitionPerfRows.forEach(r=>{if(!r.recipient_id)return;const p=perfMap.get(r.recipient_id)||{name:r.recipient_name||memberName(r.recipient_id),role:"team member",assigned:0,completed:0,open:0,overdue:0,uploads:0,approved:0,reviewed:0,awards:0};p.awards++;perfMap.set(r.recipient_id,p)});
 const perfPeople=[...perfMap.values()].filter(p=>p.assigned||p.uploads||p.awards).sort((a,b)=>(b.completed+a.approved+b.awards)-(a.completed+b.approved+a.awards));
 const performanceHtml=perfPeople.length?'<div class="h3-performance-table-wrap"><table class="h3-performance-table"><thead><tr><th>Contributor</th><th>Assignments</th><th>Open / overdue</th><th>Uploads</th><th>Approval</th><th>Recognition</th></tr></thead><tbody>'+perfPeople.map(p=>'<tr><td><b>'+esc(p.name)+'</b><small>'+esc(p.role)+'</small></td><td>'+p.completed+' / '+p.assigned+'<small>'+(p.assigned?Math.round(p.completed/p.assigned*100)+'% marked complete':'No assignments')+'</small></td><td>'+p.open+' / '+p.overdue+'</td><td>'+p.uploads+'</td><td>'+(p.reviewed?Math.round(p.approved/p.reviewed*100)+'%':'—')+'<small>'+p.approved+' approved · '+p.reviewed+' reviewed</small></td><td>'+p.awards+'</td></tr>').join("")+'</tbody></table></div>':'<p class="hub3-empty">No contributor performance history yet. Approved contributors will appear after assignments, segment uploads, or recognition are recorded.</p>';

 const stageCounts=new Map();editRows.forEach(x=>stageCounts.set(norm(x.status)||"unknown",(stageCounts.get(norm(x.status)||"unknown")||0)+1));
 const stageHtml=stageCounts.size?[...stageCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([s,n])=>'<div class="hub3-analytics-line"><span>'+esc(s.replaceAll("_"," "))+'</span><b>'+n+'</b></div>').join(""):'<p class="hub3-empty">No editing records yet.</p>';
 const uploadStages=new Map();uploadRows.forEach(x=>uploadStages.set(norm(x.status)||"unknown",(uploadStages.get(norm(x.status)||"unknown")||0)+1));
 const uploadHtml=uploadStages.size?[...uploadStages.entries()].sort((a,b)=>b[1]-a[1]).map(([s,n])=>'<div class="hub3-analytics-line"><span>'+esc(s.replaceAll("_"," "))+'</span><b>'+n+'</b></div>').join(""):'<p class="hub3-empty">No segment submissions yet.</p>';
 const activityHtml=weeklyActivity.slice(0,8).map(a=>'<article class="hub3-activity"><div class="hub3-activity-top"><b>'+esc(memberName(a.actor_id))+' · '+esc(String(a.action||"Production update").replaceAll("_"," "))+'</b><time>'+when(a.created_at)+'</time></div>'+(a.detail?'<p>'+esc(a.detail)+'</p>':"")+'</article>').join("")||'<p class="hub3-empty">No recorded team activity in the last seven days.</p>';
 const note=episodes.length||assignmentRows.length||uploadRows.length||editRows.length?'Figures use up to 500 assignments, 500 submissions, 300 editing records and 100 recent activity records visible to this producer account. Completion is based on current status; on-time completion is not calculated because assignments do not store a completion timestamp.':'No production records have been entered yet. As the team creates episodes, assigns work and submits segments, this dashboard will populate automatically.';
 set("h3AnalyticsBreakdown",'<section class="h3-performance-section"><div class="h3-performance-section-head"><div><span class="hub3-kicker">CREW PERFORMANCE · 12.0</span><h4>Contributor delivery & recognition</h4></div><span class="h3-performance-legend">Live records · no estimated scores</span></div>'+performanceHtml+'</section><div class="hub3-analytics-grid"><section><h4>Contributor delivery</h4>'+peopleHtml+'</section><section><h4>Editing pipeline</h4>'+stageHtml+'</section><section><h4>Submission review queue</h4>'+uploadHtml+'</section><section><h4>Recent production activity</h4>'+activityHtml+'</section></div><p class="hub3-small hub3-analytics-footnote">'+note+' Episode completion rate: '+episodeProgress+'%. Upload approval rate: '+approvalRate+'%. Recognition totals are based on existing award records. Assignment on-time rate is unavailable because no completion timestamp is stored.</p>');
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
 const reviewAlerts=pending.map(x=>({user_id:user.id,title:"Segment awaiting review",message:(x.title||"A new segment")+(x.tn_production_episodes?.episode_number?" · "+x.tn_production_episodes.episode_number:"")+" is waiting in the producer review desk.",href:"https://crowrulesentertainment-oss.github.io/tacomanights/production/?review-upload="+encodeURIComponent(x.id)}));
 try{await createDedupedNotifications(reviewAlerts)}catch(error){console.warn("Review notifications could not be created",error.message)}
 await loadNotifications();
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
async function renderRecognition(){
 const query=recognitionSearch;
 const filtered=recognitionRows.filter(x=>{
  const hay=[x.recipient_name,x.award_name,x.reason,x.tn_production_episodes?.title,x.tn_production_episodes?.episode_number].join(" ").toLowerCase();
  return (!query||hay.includes(query))&&(recognitionAwardFilter==="all"||x.award_name===recognitionAwardFilter);
 });
 const people=new Set(recognitionRows.map(x=>x.recipient_id));
 const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
 const recent=recognitionRows.filter(x=>new Date(x.awarded_at)>=monthStart).length;
 set("h3RecognitionStats",[
  ["Recognition moments",recognitionRows.length],
  ["Crew members celebrated",people.size],
  ["Award categories",new Set(recognitionRows.map(x=>x.award_name)).size],
  ["This month",recent]
 ].map(([label,n])=>'<div class="hub3-stat"><b>'+n+'</b><span>'+label+'</span></div>').join(""));
 const totals=new Map();
 recognitionRows.forEach(x=>totals.set(x.recipient_name,(totals.get(x.recipient_name)||0)+1));
 const leaders=Array.from(totals.entries()).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5);
 set("h3RecognitionLeaders",leaders.map(([name,total],i)=>'<div class="hub3-recognition-leader"><span class="hub3-recognition-rank">'+(i+1)+'</span><b>'+esc(name)+'</b><span>'+total+' '+(total===1?"recognition":"recognitions")+'</span></div>').join("")||'<p class="hub3-empty">The first team achievement will appear here.</p>');
 set("h3RecognitionResultCount",filtered.length+" of "+recognitionRows.length+" recognition records");
 set("h3RecognitionList",filtered.map(x=>{
  const ep=x.tn_production_episodes;
  return '<article class="hub3-recognition-card"><div class="hub3-recognition-card-top"><span class="hub3-award">'+esc(x.award_name)+'</span><time>'+when(x.awarded_at)+'</time></div><h4>'+esc(x.recipient_name)+'</h4><p>'+esc(x.reason)+'</p><div class="hub3-recognition-card-foot">'+(ep?'<span>'+esc(ep.episode_number?ep.episode_number+" · ":"")+esc(ep.title)+'</span>':'<span>General contribution</span>')+'<span>'+((totals.get(x.recipient_name)||1))+' total recognition'+((totals.get(x.recipient_name)||1)===1?"":"s")+'</span></div></article>';
 }).join("")||'<p class="hub3-empty">'+(recognitionRows.length?"No recognition records match those filters.":"The recognition wall is ready for its first shout-out. Team achievements will appear here as producers recognize contributions.")+'</p>');
}
async function loadRecognition(){
 recognitionRows=await rows("tn_production_recognition",db.from("tn_production_recognition").select("id,recipient_id,recipient_name,award_name,reason,awarded_at,episode_id,tn_production_episodes(episode_number,title)").order("awarded_at",{ascending:false}).limit(250));
 renderRecognition();
}
async function submit(form){
 const type=form.dataset.h3Form,d=formData(form);notice(form,"Saving…");
 try{
  let result;
  if(type==="research"&&d.source_url&&!safeHttps(d.source_url))throw new Error("Research source links must use HTTPS.");
  if(type==="guest"&&d.meeting_url&&!safeHttps(d.meeting_url))throw new Error("Meeting links must use HTTPS.");
  if(type==="training"&&d.resource_url&&!safeHttps(d.resource_url))throw new Error("Training resource links must use HTTPS.");
  if(type==="calendar"&&d.ends_at&&new Date(d.ends_at)<new Date(d.starts_at))throw new Error("The event end time must be after its start time.");
  if(type==="research"){result=await db.from("tn_production_research").insert({episode_id:d.episode_id||null,title:d.title.trim(),category:d.category,source_name:d.source_name?.trim()||null,source_url:d.source_url?.trim()||null,summary:d.summary.trim(),assigned_to:isAdmin?(d.assigned_to||null):null,status:isAdmin?(d.status||"idea"):"idea",created_by:user.id});}
  if(type==="editing"){const editorId=d.editor_id||user.id;const payload={episode_id:d.episode_id,status:d.status,version_label:d.version_label||null,target_ready_at:d.target_ready_at?new Date(d.target_ready_at).toISOString():null,notes:d.notes||null,review_notes:d.review_notes||null,updated_by:user.id,editor_id:editorId,updated_at:new Date().toISOString()};if(d.status==="approved"){payload.approved_by=user.id;payload.approved_at=new Date().toISOString()}else{payload.approved_by=null;payload.approved_at=null}result=await db.from("tn_production_editing").upsert(payload,{onConflict:"episode_id"});if(!result.error&&editorId!==user.id){const ep=episodes.find(x=>x.id===d.episode_id);const notice=await db.from("tn_notifications").insert({user_id:editorId,title:"Editing assignment",message:"You have been assigned to edit "+(ep?.episode_number?ep.episode_number+" · ":"")+(ep?.title||"an episode")+". Check the Production Hub for details.",href:"https://crowrulesentertainment-oss.github.io/tacomanights/production/"});if(notice.error)console.warn("Editor notification was not sent",notice.error)}}
  if(type==="calendar"){result=await db.from("tn_production_calendar").insert({title:d.title,event_type:d.event_type,starts_at:new Date(d.starts_at).toISOString(),ends_at:d.ends_at?new Date(d.ends_at).toISOString():null,description:d.description||null,created_by:user.id});}
  if(type==="guest"){let availability={};if(d.availability?.trim()){try{availability=JSON.parse(d.availability)}catch{throw new Error("Guest availability must be valid JSON.")}}if(d.interview_at&&Number.isNaN(new Date(d.interview_at).getTime()))throw new Error("Enter a valid interview date and time.");result=await db.from("tn_production_guests").insert({guest_name:d.guest_name.trim(),email:d.email||null,phone:d.phone||null,organization:d.organization||null,episode_id:d.episode_id||null,topic:d.topic||null,notes:d.notes||null,availability,status:d.status,interview_at:d.interview_at?new Date(d.interview_at).toISOString():null,meeting_url:d.meeting_url||null,created_by:user.id});}
  if(type==="chat"){result=await db.from("tn_production_chat_messages").insert({user_id:user.id,display_name:profile.display_name||user.email,message:d.message.trim()});}
  if(type==="training"){const order=Number(d.sort_order||0);if(!Number.isInteger(order)||order<0)throw new Error("Display order must be a whole number of zero or greater.");result=await db.from("tn_production_training").insert({title:d.title.trim(),category:d.category,description:d.description.trim(),resource_url:d.resource_url||null,content:d.content||null,sort_order:order,is_published:true,created_by:user.id});}
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
 $("#h3CalendarPrev")?.addEventListener("click",()=>{if($("#h3CalendarRange")?.value==="week")calendarCursor.setDate(calendarCursor.getDate()-7);else{calendarCursor.setDate(1);calendarCursor.setMonth(calendarCursor.getMonth()-1)}renderCalendar()});
 $("#h3CalendarNext")?.addEventListener("click",()=>{if($("#h3CalendarRange")?.value==="week")calendarCursor.setDate(calendarCursor.getDate()+7);else{calendarCursor.setDate(1);calendarCursor.setMonth(calendarCursor.getMonth()+1)}renderCalendar()});
 $("#h3CalendarToday")?.addEventListener("click",()=>{calendarCursor=new Date();renderCalendar()});
 $("#h3CalendarType")?.addEventListener("change",renderCalendar);
 $("#h3CalendarRefresh")?.addEventListener("click",()=>loadCalendar().catch(e=>{set("h3CalendarList",'<p class="hub3-empty">Calendar refresh failed: '+esc(e.message||"Please try again.")+'</p>')}));
 $("#h3AvailabilityRefresh")?.addEventListener("click",loadHostAvailability);
 $("#h3ScheduleRefresh")?.addEventListener("click",()=>loadCommand().catch(e=>{set("h3ScheduleInsights",'<p class="hub3-empty">Schedule refresh failed: '+esc(e.message||"Please retry.")+'</p>')}));
 $("#h3RequestType")?.addEventListener("change",updateRequestForm);updateRequestForm();
 $("#h3ContributorRequestForm")?.addEventListener("submit",e=>{e.preventDefault();submitContributorRequest(e.currentTarget)});


 document.querySelectorAll("[data-h3-go]").forEach(b=>b.addEventListener("click",()=>{tab(b.dataset.h3Go);document.querySelector(".hub3-nav")?.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll("[data-h3-legacy]").forEach(b=>b.addEventListener("click",()=>{const target=document.getElementById(b.dataset.h3Legacy);if(!target)return;document.querySelectorAll(".ph-view").forEach(v=>v.classList.remove("active"));target.classList.add("active");document.querySelectorAll(".ph-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===b.dataset.h3Legacy.replace("view-","")));target.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll(".hub3-form").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();submit(f)}));
 document.querySelector("[data-h3-refresh]")?.addEventListener("click",refresh);
 document.addEventListener("click",async e=>{
  if(e.target.closest("#h3CommunicationRefresh")){const b=$("#h3CommunicationRefresh");b.disabled=true;try{await loadChat();await loadNotifications()}catch(error){set("h3ChatMessages",'<p class="hub3-empty">Inbox refresh failed: '+esc(error.message||"Please try again.")+'</p>')}finally{b.disabled=false}return}
  const review=e.target.closest("[data-h3-review]");if(review){await reviewSubmission(review);return}
  const requestReview=e.target.closest("[data-request-review]");if(requestReview){await reviewContributorRequest(requestReview);return}

  const researchSave=e.target.closest("[data-h3-research-save]");if(researchSave&&isAdmin){const card=researchSave.closest(".hub3-research-card"),id=researchSave.dataset.h3ResearchSave,get=name=>card?.querySelector('[data-research-field="'+name+'"][data-research-id="'+id+'"]')?.value||"";const stage=get("status");if(!["idea","researching","ready","archived"].includes(stage)){alert("Choose a valid research stage.");return}researchSave.disabled=true;const {error}=await db.from("tn_production_research").update({status:stage,assigned_to:get("assigned_to")||null,notes:get("notes").trim()||null,updated_at:new Date().toISOString()}).eq("id",id);researchSave.disabled=false;if(error){alert("Could not save research review: "+error.message);return}await logActivity("research_updated","Updated research status, ownership, or fact-check notes");await loadResearch();return}
  const guestSave=e.target.closest("[data-h3-guest-save]");if(guestSave&&isAdmin){const card=guestSave.closest(".hub3-guest-card"),id=guestSave.dataset.h3GuestSave,get=name=>card?.querySelector('[data-guest-field="'+name+'"]')?.value||"";let availability={};try{availability=get("availability").trim()?JSON.parse(get("availability")):{}}catch{alert("Guest availability must be valid JSON.");return}const meeting=get("meeting_url");if(meeting&&!safeHttps(meeting)){alert("Meeting links must use HTTPS.");return}const interview=get("interview_at");if(interview&&Number.isNaN(new Date(interview).getTime())){alert("Enter a valid interview date and time.");return}guestSave.disabled=true;const payload={phone:get("phone").trim()||null,interview_at:interview?new Date(interview).toISOString():null,meeting_url:meeting.trim()||null,notes:get("notes").trim()||null,availability,updated_at:new Date().toISOString()};const {error}=await db.from("tn_production_guests").update(payload).eq("id",id);guestSave.disabled=false;if(error){alert("Could not save booking details: "+error.message);return}await logActivity("guest_booking_updated","Updated guest booking details");await loadGuests();return}
  const filter=e.target.closest("[data-h3-notification-filter]");if(filter){notificationFilter=filter.dataset.h3NotificationFilter;renderNotifications()}
  const notifRefresh=e.target.closest("[data-h3-notifications-refresh]");if(notifRefresh){notifRefresh.disabled=true;try{if(isAdmin)await loadReviewDesk();else{const mine=await rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,status,due_at,tn_production_episodes(episode_number,title)").eq("assignee_id",user.id).order("due_at").limit(100));await syncAssignmentReminders(mine)}await loadNotifications()}catch(error){console.warn("Notification refresh failed",error);alert("Notifications could not be refreshed: "+(error.message||"Please try again."))}finally{notifRefresh.disabled=false}return}
  const readAll=e.target.closest("[data-h3-read-all]");if(readAll){readAll.disabled=true;const {error}=await db.from("tn_notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);if(error){readAll.disabled=false;alert("Could not mark notifications as read: "+error.message)}else{await logActivity("notifications_read_all","Marked all notifications as read");await loadNotifications()}}
  const read=e.target.closest("[data-h3-read]");if(read){const {error}=await db.from("tn_notifications").update({read_at:new Date().toISOString()}).eq("id",read.dataset.h3Read).eq("user_id",user.id);if(!error){await logActivity("notification_read","Marked a notification as read");await loadNotifications()}}
  const complete=e.target.closest("[data-h3-complete]");if(complete){complete.disabled=true;const {error}=await db.from("tn_production_training_progress").upsert({resource_id:complete.dataset.h3Complete,user_id:user.id,completed_at:new Date().toISOString()},{onConflict:"resource_id,user_id"});if(!error){await logActivity("training_completed","Completed a training resource");await loadTraining()}else{complete.disabled=false;alert("Could not save training progress: "+error.message)}}
 });
 document.addEventListener("click",async e=>{const save=e.target.closest("[data-editing-save]");if(!save||!isAdmin)return;const id=save.dataset.editingSave;const row=save.closest("[data-editing-row]");const stage=row?.querySelector("[data-editing-stage]")?.value;if(!stage)return;save.disabled=true;const payload={status:stage,updated_by:user.id,updated_at:new Date().toISOString()};if(stage==="approved"){payload.approved_by=user.id;payload.approved_at=new Date().toISOString()}else{payload.approved_by=null;payload.approved_at=null}const {error}=await db.from("tn_production_editing").update(payload).eq("id",id);save.disabled=false;if(error){alert("Could not update editing stage: "+error.message);return}await logActivity("editing_stage_updated","Moved an episode edit to "+stage.replaceAll("_"," "));await refresh()});
 document.addEventListener("input",e=>{if(e.target.id==="h3ResearchSearch"){const cursor=e.target.selectionStart;researchSearch=e.target.value.trim().toLowerCase();renderResearch();const input=$("#h3ResearchSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}if(e.target.id==="h3GuestSearch"){const cursor=e.target.selectionStart;guestSearch=e.target.value.trim().toLowerCase();renderGuests();const input=$("#h3GuestSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}if(e.target.id==="h3CommunicationSearch"){const cursor=e.target.selectionStart;chatSearch=e.target.value.trim().toLowerCase();renderCommunication();const input=$("#h3CommunicationSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}if(e.target.id==="h3TrainingSearch"){const cursor=e.target.selectionStart;trainingSearch=e.target.value.trim().toLowerCase();renderTraining();const input=$("#h3TrainingSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}if(e.target.id==="h3RecognitionSearch"){const cursor=e.target.selectionStart;recognitionSearch=e.target.value.trim().toLowerCase();renderRecognition();const input=$("#h3RecognitionSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}if(e.target.id==="h3FeedbackSearch"){const cursor=e.target.selectionStart;feedbackSearch=e.target.value.trim().toLowerCase();renderFeedback();const input=$("#h3FeedbackSearch");if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}}});
 document.addEventListener("change",async e=>{if(e.target.id==="h3ResearchStatusFilter"){researchStatusFilter=e.target.value;renderResearch()}if(e.target.id==="h3ResearchCategoryFilter"){researchCategoryFilter=e.target.value;renderResearch()}if(e.target.id==="h3GuestStatusFilter"){guestStatusFilter=e.target.value;renderGuests()}if(e.target.id==="h3CommunicationFilter"){chatFilter=e.target.value;renderCommunication()}if(e.target.id==="h3TrainingCategory"){trainingCategory=e.target.value;renderTraining()}if(e.target.id==="h3RecognitionAwardFilter"){recognitionAwardFilter=e.target.value;renderRecognition()}if(e.target.id==="h3FeedbackStatus"){feedbackStatusFilter=e.target.value;renderFeedback()}if(e.target.id==="h3FeedbackCategory"){feedbackCategoryFilter=e.target.value;renderFeedback()}const field=e.target.closest("[data-h3-feedback]");if(field&&isAdmin){field.disabled=true;const {error}=await db.from("tn_production_feedback").update({status:field.value,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",field.dataset.h3Feedback);if(error){field.disabled=false;alert("Could not update feedback status: "+error.message)}else{await logActivity("feedback_updated","Changed audience feedback status to "+field.value);await loadFeedback()}}const guest=e.target.closest("[data-h3-guest-status]");if(guest&&isAdmin){guest.disabled=true;const {error}=await db.from("tn_production_guests").update({status:guest.value,updated_at:new Date().toISOString()}).eq("id",guest.dataset.h3GuestStatus);guest.disabled=false;if(error)alert("Could not update guest status: "+error.message);else{await logActivity("guest_status_updated","Changed guest booking status to "+guest.value);await loadGuests()}}});
 document.addEventListener("change",e=>{
  const check=e.target.closest("[data-h3-checklist]");if(!check)return;
  const id=check.dataset.h3Checklist,index=check.dataset.checkIndex,key="tn-assignment-checklist-"+id;
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  saved[index]=check.checked;
  try{localStorage.setItem(key,JSON.stringify(saved))}catch(error){console.warn("Checklist could not be saved on this device",error)}
  const card=check.closest("[data-assignment-card]"),summary=card?.querySelector(".h3-assignment-checklist summary");
  if(summary){const count=card.querySelectorAll("[data-h3-checklist]:checked").length;summary.textContent="Assignment checklist · "+count+"/4 complete"}
 });
 document.addEventListener("click",e=>{
  const button=e.target.closest("[data-h3-resubmit]");if(!button)return;
  const form=$("#uploadForm");if(!form)return;
  const title=form.elements.title,episode=form.elements.episode_id,notes=form.elements.notes;
  if(title)title.value=button.dataset.title||"Revised segment";
  if(episode&&button.dataset.episode)episode.value=button.dataset.episode;
  if(notes)notes.value="RESUBMISSION — responding to producer feedback:\n"+(button.dataset.feedback||"Please review the latest version.")+"\n\nChanges made in this version:\n";
  const legacy=document.querySelector('[data-h3-legacy="view-uploads"]');if(legacy)legacy.click();
  form.scrollIntoView({behavior:"smooth",block:"center"});
  const asset=form.elements.asset;if(asset)asset.focus({preventScroll:true});
  const message=$("#uploadMessage");if(message)message.textContent="Choose the corrected file(s), update the notes with what changed, then upload. This creates a new submission and preserves the original review history.";
 });
 await refresh();
}
init().catch(e=>{console.error("Production Hub 3.0 could not initialize",e);["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"].forEach(id=>set(id,'<p class="hub3-empty">The production workspace could not initialize: '+esc(e?.message||"Please refresh and try again.")+'</p>'))});
})();