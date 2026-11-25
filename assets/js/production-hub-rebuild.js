(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{},$=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let db,user,profile,admin=false,data={episodes:[],assignments:[],uploads:[],research:[],notices:[],members:[]},busy=false;
const show=(id,on)=>$(id)?.classList.toggle("hidden",!on),msg=(id,t)=>{const e=$(id);if(e)e.textContent=t};
const date=v=>{if(!v)return"Not scheduled";const d=new Date(v);return Number.isNaN(+d)?"Date unavailable":d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"})};
const active=s=>!["complete","completed","approved","published","done","cancelled"].includes(String(s||"").toLowerCase());
function status(s){return '<span class="pill">'+esc(String(s||"pending").replaceAll("_"," "))+'</span>'}
async function query(q){let timer;try{const {data,error}=await Promise.race([q,new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error("Request timed out. Check your connection and try Refresh.")),8000)})]);if(error)throw error;return data||[]}finally{clearTimeout(timer)}}
function render(){
 const episodes=data.episodes,assign=data.assignments,uploads=data.uploads,notices=data.notices;
 $("#statEpisodes").textContent=episodes.length;$("#statAssignments").textContent=assign.filter(x=>active(x.status)).length;$("#statUploads").textContent=uploads.length;$("#statNotices").textContent=notices.filter(x=>!x.read_at).length;
 const episodeHTML=episodes.map(e=>'<article class="item"><div class="item-top"><strong>'+esc((e.episode_number?'Episode '+e.episode_number+' · ':'')+e.title)+'</strong>'+status(e.status)+'</div><p>'+esc(e.topic||"No topic added")+' · '+date(e.premiere_at)+'</p></article>').join("")||'<p class="muted">No episodes have been added yet.</p>';
 const assignmentHTML=assign.map(a=>'<article class="item"><div class="item-top"><strong>'+esc(a.title)+'</strong>'+status(a.status)+'</div><p>'+esc(data.episodes.find(e=>e.id===a.episode_id)?.title||"Episode")+' · Due '+date(a.due_at)+'</p><p>'+esc(a.instructions||"No additional instructions.")+'</p></article>').join("")||'<p class="muted">No assignments are waiting for you.</p>';
 $("#overviewEpisodes").innerHTML=episodeHTML.slice(0,6000);$("#episodeList").innerHTML=episodeHTML;$("#overviewAssignments").innerHTML=assignmentHTML.slice(0,6000);$("#assignmentList").innerHTML=assignmentHTML;$("#episodeCount").textContent=episodes.length+" total";$("#assignmentCount").textContent=assign.length+" total";
 $("#uploadList").innerHTML=uploads.map(x=>'<article class="item"><div class="item-top"><strong>'+esc(x.title)+'</strong>'+status(x.status)+'</div><p>'+esc(data.episodes.find(e=>e.id===x.episode_id)?.title||"Episode")+' · '+date(x.created_at)+'</p><p>'+esc(x.producer_note||x.notes||"No review notes.")+'</p></article>').join("")||'<p class="muted">No submissions are available yet.</p>';
 $("#researchList").innerHTML=data.research.map(x=>'<article class="item"><div class="item-top"><strong>'+esc(x.title)+'</strong>'+status(x.status)+'</div><p>'+esc(x.category)+' · '+esc(x.summary)+'</p>'+(x.source_url&&/^https:\/\//.test(x.source_url)?'<p><a target="_blank" rel="noopener" href="'+esc(x.source_url)+'">'+esc(x.source_name||"Open source")+' ↗</a></p>':"")).join("")||'<p class="muted">The research desk is clear.</p>';
 $("#noticeList").innerHTML=notices.map(x=>'<article class="item"><div class="item-top"><strong>'+esc(x.title)+'</strong>'+status(x.read_at?"read":"unread")+'</div><p>'+esc(x.message)+'</p><p>'+date(x.created_at)+'</p>'+(x.href&&x.href.startsWith("/")?'<p><a href="'+esc(x.href)+'">Open related workspace ↗</a></p>':"")+'</article>').join("")||'<p class="muted">No notices yet.</p>';
}
async function refresh(){
 if(busy)return;busy=true;$("#refresh").disabled=true;$("#notice").textContent="Refreshing production data…";
 try{
  data.episodes=await query(db.from("tn_production_episodes").select("id,episode_number,title,topic,premiere_at,status").order("premiere_at",{ascending:true}).limit(100));
  data.assignments=await query(db.from("tn_production_assignments").select("id,episode_id,assignee_id,title,instructions,due_at,status,created_at").eq("assignee_id",user.id).order("due_at").limit(100));
  data.uploads=await query(db.from("tn_production_uploads").select("id,episode_id,title,notes,status,producer_note,created_at").eq("uploader_id",user.id).order("created_at",{ascending:false}).limit(50));
  data.research=await query(db.from("tn_production_research").select("id,episode_id,title,category,summary,source_url,source_name,status,created_at").order("created_at",{ascending:false}).limit(50));
  data.notices=await query(db.from("tn_production_notifications").select("id,title,message,href,read_at,created_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50));
  if(admin){data.assignments=await query(db.from("tn_production_assignments").select("id,episode_id,assignee_id,title,instructions,due_at,status,created_at").order("due_at").limit(200));data.uploads=await query(db.from("tn_production_uploads").select("id,episode_id,uploader_id,title,notes,status,producer_note,created_at").order("created_at",{ascending:false}).limit(100));}
  render();$("#notice").textContent="Production data is up to date.";
 }catch(e){$("#notice").textContent="Some production data could not load: "+(e.message||"Please try again.");console.error("Production workspace refresh",e)}finally{busy=false;$("#refresh").disabled=false}
}
function activate(name){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name))}
async function start(){
 if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseAnonKey){$("#notice").textContent="Production sign-in is unavailable because the public Supabase configuration did not load.";return}
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;
 if(!session){show("#login",true);$("#notice").textContent="Sign in to access the private production workspace.";return}
 user=session.user;$("#notice").textContent="Checking your production membership…";
 const profileRows=await query(db.from("tn_production_profiles").select("id,display_name,email,role").eq("id",user.id).limit(1));profile=profileRows[0];
 if(!profile||!["contributor","producer","admin"].includes(profile.role)){show("#pending",true);$("#notice").textContent="Membership approval is required.";return}
 admin=["producer","admin"].includes(profile.role);if(admin)document.querySelector("#statAssignments").previousElementSibling.textContent="TEAM ASSIGNMENTS";show("#workspace",true);$("#welcomeTitle").textContent="Welcome, "+(profile.display_name||"team member")+".";$("#roleLine").textContent=(admin?"Producer access":"Contributor access")+" · Tacoma Nights production";
 if(admin){show("#assignPanel",true);await fillAdminLists()}
 await refresh();
}
async function fillAdminLists(){try{if(!data.episodes.length)data.episodes=await query(db.from("tn_production_episodes").select("id,episode_number,title").order("premiere_at").limit(100));if(!data.members.length)data.members=await query(db.from("tn_production_profiles").select("id,display_name,role").in("role",["contributor","producer"]).order("display_name"));$("#assignEpisode").innerHTML='<option value="">Choose episode…</option>'+data.episodes.map(e=>'<option value="'+esc(e.id)+'">'+esc((e.episode_number?"Episode "+e.episode_number+" · ":"")+e.title)+'</option>').join("");$("#assignMember").innerHTML='<option value="">Choose contributor…</option>'+data.members.filter(m=>m.role==="contributor").map(m=>'<option value="'+esc(m.id)+'">'+esc(m.display_name||"Contributor")+'</option>').join("")}catch(e){msg("#assignmentMessage",e.message)}}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;msg("#loginMessage","Signing in…");try{const {error}=await db.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)throw error;location.reload()}catch(err){msg("#loginMessage",err.message||"Sign in failed.")}finally{b.disabled=false}});
async function signout(){if(db)await db.auth.signOut();location.reload()}
$("#signout").addEventListener("click",signout);$("#pendingSignout").addEventListener("click",signout);$("#refresh").addEventListener("click",refresh);
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>activate(b.dataset.tab)));document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>activate(b.dataset.open)));
$("#assignmentForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;msg("#assignmentMessage","Saving assignment…");try{const d=Object.fromEntries(new FormData(f));const payload={episode_id:d.episode_id,assignee_id:d.assignee_id,assigned_by:user.id,title:d.title.trim(),instructions:d.instructions.trim()||null,due_at:d.due_at?new Date(d.due_at).toISOString():null,status:"assigned"};const {error}=await db.from("tn_production_assignments").insert(payload);if(error)throw error;f.reset();msg("#assignmentMessage","Assignment created.");await refresh()}catch(err){msg("#assignmentMessage",err.message||"Could not create assignment.")}finally{b.disabled=false}});
start().catch(e=>{console.error("Production Hub initialization",e);$("#notice").textContent="The workspace could not start: "+(e.message||"Please reload and try again.");show("#login",true)});
})();