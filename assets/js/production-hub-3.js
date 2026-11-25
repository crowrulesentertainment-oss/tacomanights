(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const when=v=>{if(!v)return"Not scheduled";const d=new Date(v);return Number.isNaN(d.getTime())?"Date unavailable":d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})};
const safeHttps=value=>{if(!value)return"";try{const u=new URL(String(value));return u.protocol==="https:"?u.href:""}catch{return""}};
const root=document.body.dataset.root||"../";
let db,user,profile,isAdmin=false,episodes=[],members=[];
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
 const tasks=[["Command center",["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"],loadCommand],["Contributor workspace",["h3MyAssignments","h3MyUploads"],loadContributor],["Editing room",["h3EditingList"],loadEditing],["Production calendar",["h3CalendarList"],loadCalendar],["Research desk",["h3ResearchList"],loadResearch],["Notifications",["h3NotificationList"],loadNotifications],["Guest bookings",["h3GuestList"],loadGuests],["Communication center",["h3ChatMessages","h3Announcements"],loadChat],["Training center",["h3TrainingList"],loadTraining],["Production analytics",["h3AnalyticsStats","h3AnalyticsBreakdown"],loadAnalytics],["Audience feedback",["h3FeedbackList"],loadFeedback],["Crew recognition",["h3RecognitionList"],loadRecognition],["Recent activity",["h3ActivityFeed"],loadActivity]];
 await Promise.all(tasks.map(async([label,targets,fn])=>{try{await fn()}catch(error){console.error(label,error);const html='<p class="hub3-empty">Could not load '+label.toLowerCase()+': '+esc(error?.message||"Please try again.")+'</p>';targets.forEach(id=>set(id,html))}}));
}
async function loadBase(){
 episodes=await rows("tn_production_episodes",db.from("tn_production_episodes").select("id,episode_number,title,topic,premiere_at,status").order("premiere_at",{ascending:true}));
 $("#h3EditingEpisode").innerHTML=options(episodes,"Choose episode…");$("#h3ResearchEpisode").innerHTML=options(episodes,"General research / idea vault");$("#h3GuestEpisode").innerHTML=options(episodes,"Not assigned yet");$("#h3RecognitionEpisode").innerHTML=options(episodes,"General contribution");
 if(isAdmin){members=await rows("tn_production_profiles",db.from("tn_production_profiles").select("id,display_name,email,role").in("role",["contributor","producer","admin"]).order("display_name"));$("#h3RecognitionMember").innerHTML=members.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||m.email||"Team member")+'</option>').join("")}
 document.querySelectorAll(".hub3-form button.admin-only").forEach(b=>b.classList.toggle("hidden",!isAdmin));document.querySelectorAll(".hub3-form[data-admin-only]").forEach(form=>form.classList.toggle("hidden",!isAdmin));
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
 const [assignments,uploads]=await Promise.all([rows("tn_production_assignments",db.from("tn_production_assignments").select("id,title,instructions,status,due_at,tn_production_episodes(episode_number,title)").eq("assignee_id",user.id).order("due_at")),rows("tn_production_uploads",db.from("tn_production_uploads").select("id,title,status,producer_note,created_at").eq("uploader_id",user.id).order("created_at",{ascending:false}).limit(12))]);
 set("h3MyAssignments",assignments.map(a=>'<article class="hub3-row"><div><b>'+esc(a.title)+'</b><p>'+esc(a.tn_production_episodes?.episode_number||"Episode")+" · "+esc(a.tn_production_episodes?.title||"")+'</p><p>'+esc(a.instructions||"No additional instructions.")+'</p><small>Due '+when(a.due_at)+'</small></div>'+status(a.status)+'</article>').join("")||'<p class="hub3-empty">You do not have any assignments yet.</p>');
 set("h3MyUploads",uploads.map(a=>'<div class="hub3-mini"><b>'+esc(a.title)+'</b>'+status(a.status)+(a.producer_note?'<small>'+esc(a.producer_note)+'</small>':"")+'</div>').join("")||'<p class="hub3-empty">Your uploaded segments will appear here.</p>');
}
async function loadEditing(){
 const list=await rows("tn_production_editing",db.from("tn_production_editing").select("*,tn_production_episodes(episode_number,title,premiere_at)").order("updated_at",{ascending:false}));
 set("h3EditingList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.tn_production_episodes?.episode_number||"Episode")+' · '+esc(x.tn_production_episodes?.title||"")+'</b><p>Editor: '+(x.editor_id===user.id?"You":esc(members.find(m=>m.id===x.editor_id)?.display_name||"Not assigned"))+' · '+esc(x.version_label||"No version label")+'</p><small>Target: '+when(x.target_ready_at)+' · Updated '+when(x.updated_at)+'</small><p>'+esc(x.notes||"")+'</p></div>'+status(x.status)+'</article>').join("")||'<p class="hub3-empty">No editing records yet. Producers can create the first status from the panel.</p>');
}
async function loadCalendar(){
 const list=await rows("tn_production_calendar",db.from("tn_production_calendar").select("id,title,description,event_type,starts_at,ends_at,all_day").gte("starts_at",new Date(Date.now()-86400000).toISOString()).order("starts_at").limit(40));
 set("h3CalendarList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.title)+'</b><p>'+esc(x.description||"")+'</p><small>'+when(x.starts_at)+' '+(x.ends_at?"— "+when(x.ends_at):"")+'</small></div>'+status(x.event_type)+'</article>').join("")||'<p class="hub3-empty">No scheduled production events. The weekly rhythm above is your default workflow.</p>');
}
async function loadResearch(){
 const list=await rows("tn_production_research",db.from("tn_production_research").select("id,title,category,summary,source_url,source_name,status,created_at,created_by").order("created_at",{ascending:false}).limit(60));
 set("h3ResearchList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.title)+'</b><p>'+esc(x.category)+' · '+esc(x.summary)+'</p><small>'+esc(x.source_name||"Source not named")+' · '+when(x.created_at)+'</small>'+(safeHttps(x.source_url)?'<p><a href="'+esc(safeHttps(x.source_url))+'" target="_blank" rel="noopener noreferrer">Open source ↗</a></p>':"")+'</div>'+status(x.status)+'</article>').join("")||'<p class="hub3-empty">The research desk is ready for its first source or story brief.</p>');
}
async function loadNotifications(){
 const list=await rows("tn_notifications",db.from("tn_notifications").select("id,title,message,href,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50));
 set("h3NotificationList",list.map(x=>'<article class="hub3-row '+(x.read_at?"":"unread")+'"><div><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+when(x.created_at)+'</small>'+(safeHttps(x.href)?'<p><a href="'+esc(safeHttps(x.href))+'">Open related item ↗</a></p>':"")+'</div>'+(x.read_at?status("read"):'<button class="ph-btn" data-h3-read="'+esc(x.id)+'">Mark read</button>')+'</article>').join("")||'<p class="hub3-empty">You are all caught up. New production notifications will appear here.</p>');
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
 if(!isAdmin){set("h3AnalyticsStats",'<p class="hub3-empty">Production analytics are restricted to producers and administrators.</p>');return}
 const vals=await Promise.all([count("tn_production_episodes"),count("tn_production_assignments"),count("tn_production_uploads"),count("tn_production_uploads",[["status","approved"]]),count("tn_production_guests"),count("tn_production_feedback")]);
 set("h3AnalyticsStats",["Episodes","Assignments","Segment uploads","Approved segments","Guest records","Audience responses"].map((l,i)=>'<div class="hub3-stat"><b>'+vals[i]+'</b><span>'+l+'</span></div>').join(""));
 set("h3AnalyticsBreakdown",'<p class="hub3-small">Metrics reflect the records visible to your producer account. Upload approval rate: '+(vals[2]?Math.round(vals[3]/vals[2]*100):0)+'%.</p>');
}
async function loadFeedback(){
 if(!isAdmin){set("h3FeedbackList",'<p class="hub3-empty">Audience submissions are private to producers and administrators. Use the public feedback form below the page hero to share a response.</p>');return}
 const list=await rows("tn_production_feedback",db.from("tn_production_feedback").select("id,submitter_name,submitter_email,category,rating,message,status,created_at").order("created_at",{ascending:false}).limit(80));
 set("h3FeedbackList",list.map(x=>'<article class="hub3-row"><div><b>'+esc(x.submitter_name||"Community member")+'</b><p>'+esc(x.category.replaceAll("_"," "))+' · '+(x.rating?("★".repeat(x.rating)):"No rating")+'</p><p>'+esc(x.message)+'</p><small>'+esc(x.submitter_email||"No email")+' · '+when(x.created_at)+'</small></div><select data-h3-feedback="'+esc(x.id)+'"><option value="pending" '+(x.status==="pending"?"selected":"")+'>Pending</option><option value="reviewing" '+(x.status==="reviewing"?"selected":"")+'>Reviewing</option><option value="considered" '+(x.status==="considered"?"selected":"")+'>Considered</option><option value="featured" '+(x.status==="featured"?"selected":"")+'>Featured</option><option value="closed" '+(x.status==="closed"?"selected":"")+'>Closed</option></select></article>').join("")||'<p class="hub3-empty">No audience feedback has been received yet.</p>');
}
async function loadActivity(){
  if(!isAdmin){set("h3ActivityFeed",'<p class="hub3-empty">The production activity log is restricted to producers and administrators.</p>');return}
  const list=await rows("tn_production_activity",db.from("tn_production_activity").select("id,actor_id,action,detail,created_at").order("created_at",{ascending:false}).limit(30));
  set("h3ActivityFeed",list.map(x=>'<article class="hub3-activity"><div class="hub3-activity-top"><b>'+esc(members.find(m=>m.id===x.actor_id)?.display_name||"Production team")+'</b><time>'+when(x.created_at)+'</time></div><p>'+esc(x.action.replaceAll("_"," "))+(x.detail?' · '+esc(x.detail):"")+'</p></article>').join("")||'<p class="hub3-empty">No production activity has been recorded yet.</p>');
}
async function logActivity(action,detail){
  try{const {error}=await db.from("tn_production_activity").insert({actor_id:user.id,action,detail:detail||null});if(error)console.warn("Production activity log",error.message)}catch(error){console.warn("Production activity log",error)}
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
  if(type==="editing"){const payload={episode_id:d.episode_id,status:d.status,version_label:d.version_label||null,target_ready_at:d.target_ready_at?new Date(d.target_ready_at).toISOString():null,notes:d.notes||null,updated_by:user.id,editor_id:user.id,updated_at:new Date().toISOString()};result=await db.from("tn_production_editing").upsert(payload,{onConflict:"episode_id"});}
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
 document.querySelectorAll("[data-h3-go]").forEach(b=>b.addEventListener("click",()=>{tab(b.dataset.h3Go);document.querySelector(".hub3-nav")?.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll("[data-h3-legacy]").forEach(b=>b.addEventListener("click",()=>{const target=document.getElementById(b.dataset.h3Legacy);if(!target)return;document.querySelectorAll(".ph-view").forEach(v=>v.classList.remove("active"));target.classList.add("active");document.querySelectorAll(".ph-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===b.dataset.h3Legacy.replace("view-","")));target.scrollIntoView({behavior:"smooth",block:"start"})}));
 document.querySelectorAll(".hub3-form").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();submit(f)}));
 document.querySelector("[data-h3-refresh]")?.addEventListener("click",refresh);
 document.addEventListener("click",async e=>{
  const read=e.target.closest("[data-h3-read]");if(read){const {error}=await db.from("tn_notifications").update({read_at:new Date().toISOString()}).eq("id",read.dataset.h3Read).eq("user_id",user.id);if(!error){await logActivity("notification_read","Marked a notification as read");loadNotifications()}}
  const complete=e.target.closest("[data-h3-complete]");if(complete){const {error}=await db.from("tn_production_training_progress").upsert({resource_id:complete.dataset.h3Complete,user_id:user.id,completed_at:new Date().toISOString()},{onConflict:"resource_id,user_id"});if(!error){await logActivity("training_completed","Completed a training resource");loadTraining()}else alert(error.message)}
 });
 document.addEventListener("change",async e=>{const field=e.target.closest("[data-h3-feedback]");if(field&&isAdmin){const {error}=await db.from("tn_production_feedback").update({status:field.value,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",field.dataset.h3Feedback);if(error)alert(error.message);else await logActivity("feedback_updated","Changed audience feedback status to "+field.value)}const guest=e.target.closest("[data-h3-guest-status]");if(guest&&isAdmin){const {error}=await db.from("tn_production_guests").update({status:guest.value,updated_at:new Date().toISOString()}).eq("id",guest.dataset.h3GuestStatus);if(error)alert(error.message);else await logActivity("guest_status_updated","Changed guest booking status to "+guest.value)}});
 await refresh();
}
init().catch(e=>{console.error("Production Hub 3.0 could not initialize",e);["h3CommandStats","h3EpisodeCommand","h3Timeline","h3NeedsAttention"].forEach(id=>set(id,'<p class="hub3-empty">The production workspace could not initialize: '+esc(e?.message||"Please refresh and try again.")+'</p>'))});
})();