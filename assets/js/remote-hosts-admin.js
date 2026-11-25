(()=>{"use strict";
const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const say=(s)=>{const e=$("#tnRemoteHostStatus");if(e)e.textContent=s};
async function init(){
 const db=window.__tnSupabaseClient;if(!db)return;
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const {data:profile}=await db.from("tn_production_profiles").select("role").eq("id",session.user.id).maybeSingle();
 if(!profile||!["admin","producer"].includes(profile.role))return;
 const app=$("#appPanel");if(!app)return;
 const section=document.createElement("section");section.id="tnRemoteHostManager";section.className="ph-section";
 section.innerHTML=`<div class="ph-card">
 <div class="eyebrow">HOST OPERATIONS · PRODUCER / ADMIN</div>
 <h2>Remote Hosts</h2>
 <p>Manage the Tacoma Nights remote host roster, assign segment responsibilities, and coordinate recurring availability. Only approved production leadership can manage this desk.</p>
 <div class="ph-grid" style="margin:18px 0">
  <div class="ph-card span-4"><div class="ph-small">ACTIVE HOSTS</div><div class="stat" id="tnRemoteHostCount">—</div></div>
  <div class="ph-card span-4"><div class="ph-small">WEEKLY AVAILABILITY SLOTS</div><div class="stat" id="tnRemoteSlotCount">—</div></div>
  <div class="ph-card span-4"><div class="ph-small">ROSTER STATUS</div><div class="stat" id="tnRemoteRosterStatus">Loading</div></div>
 </div>
 <div class="ph-card" style="margin:18px 0"><h3>Promote a crew member to active host</h3><p>Choose a published Tacoma Nights crew profile to add it to the Remote Hosts roster. The crew profile remains intact; this creates a linked host record that can be scheduled and included in the hero count.</p><label for="tnCrewPromoteSelect">Published crew member</label><select id="tnCrewPromoteSelect" style="width:100%;background:#10141d;color:inherit;border:1px solid #555;border-radius:10px;padding:10px"><option value="">Choose a crew member…</option></select><div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><button type="button" class="ph-btn primary" id="tnCrewPromoteButton">Make active host</button><span class="ph-small" id="tnCrewPromoteStatus" aria-live="polite"></span></div></div>
 <div class="ph-card" style="margin:18px 0"><h3>Hero banner live count</h3><p>Select which approved, active remote hosts should be included in the public homepage count. Hold Ctrl (Windows) or Command (Mac) to select multiple hosts.</p><label for="tnHeroCountHosts">Hosts included in banner count</label><select id="tnHeroCountHosts" multiple size="6" style="width:100%;min-height:140px;background:#10141d;color:inherit;border:1px solid #555;border-radius:10px;padding:10px"></select><div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><button type="button" class="ph-btn primary" id="tnHeroCountSave">Save banner selection</button><span class="ph-small" id="tnHeroCountStatus" aria-live="polite"></span></div></div>
 <div class="ph-grid">
  <div class="ph-card span-5"><h3 id="tnRemoteHostFormTitle">Add a remote host</h3>
   <form id="tnRemoteHostForm" class="ph-form">
    <input type="hidden" name="id">
    <label>Display name<input name="name" required maxlength="100" placeholder="Host name"></label>
    <label>Contact email<input type="email" name="email" required maxlength="254" placeholder="host@example.com" autocomplete="email"></label>
    <label>On-air name<input name="on_air_name" maxlength="100" placeholder="Name shown on screen"></label>
    <label>Role / segment<input name="role" required maxlength="140" placeholder="Remote Host · The Weekly Lineup"></label>
    <label>Participation status<select name="team_status"><option value="active">Active</option><option value="pending">Pending</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option></select></label>
    <div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="ph-btn primary" type="submit">Save host</button><button class="ph-btn" type="button" id="tnRemoteHostCancel">Clear</button></div>
   </form>
   <p class="ph-small" id="tnRemoteHostStatus" aria-live="polite"></p>
  </div>
  <div class="ph-card span-7"><h3>Host roster</h3><div id="tnRemoteHostList" class="ph-list">Loading remote hosts…</div></div>
  <div class="ph-card span-5"><h3>Recurring availability</h3>
   <form id="tnRemoteAvailabilityForm" class="ph-form">
    <label class="full">Host<select name="host_id" id="tnRemoteAvailabilityHost" required><option value="">Choose a host…</option></select></label>
    <label>Day<select name="weekday" required>${days.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join("")}</select></label>
    <label>Time zone<select name="timezone"><option value="America/Los_Angeles">Pacific Time</option><option value="America/Denver">Mountain Time</option><option value="America/Chicago">Central Time</option><option value="America/New_York">Eastern Time</option></select></label>
    <label>Available from<input type="time" name="start_time" required></label>
    <label>Available until<input type="time" name="end_time" required></label>
    <label class="full">Notes<input name="notes" maxlength="500" placeholder="Preferred recording windows, restrictions…"></label>
    <button class="ph-btn primary full" type="submit">Save availability</button>
   </form>
   <p class="ph-small" id="tnRemoteAvailabilityStatus" aria-live="polite"></p>
  </div>
  <div class="ph-card span-7"><h3>Weekly availability board</h3><div id="tnRemoteAvailabilityList" class="ph-list">Loading availability…</div></div>
 </div>
 <div class="ph-note" style="margin-top:18px">Host management records do not automatically grant production access. Each host must separately have an approved Tacoma Nights production account. Existing public crew-profile publication and approval controls remain unchanged.</div>
 </div>`;
 app.appendChild(section);
 const nav=document.querySelector(".ph-tabs");
 if(nav){const b=document.createElement("button");b.type="button";b.className="ph-tab";b.textContent="Remote Hosts";b.addEventListener("click",()=>{document.querySelectorAll(".ph-view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".ph-tab").forEach(v=>v.classList.remove("active"));b.classList.add("active");section.scrollIntoView({behavior:"smooth",block:"start"})});nav.appendChild(b)}
 let hosts=[],crewMembers=[];
 const reset=()=>{const f=$("#tnRemoteHostForm");f.reset();f.elements.id.value="";$("#tnRemoteHostFormTitle").textContent="Add a remote host"};
 async function load(){
  try{
   const [h,a,c]=await Promise.all([
    db.from("tacoma_nights_remote_hosts").select("id,name,email,on_air_name,role,team_status,banner_count_enabled,crew_profile_id").order("name").limit(300),
    db.from("tacoma_nights_host_availability").select("id,host_id,weekday,start_time,end_time,timezone,notes").order("weekday").order("start_time").limit(500),
    db.from("tacoma_nights_crew").select("id,display_name,role_title,user_id,is_published").eq("is_published",true).order("display_name").limit(300)
   ]);
   if(h.error)throw h.error;if(a.error)throw a.error;if(c.error)throw c.error;hosts=h.data||[];const slots=a.data||[];crewMembers=c.data||[];
   $("#tnRemoteHostCount").textContent=hosts.filter(x=>String(x.team_status||"active")==="active").length;
   $("#tnRemoteSlotCount").textContent=slots.length;$("#tnRemoteRosterStatus").textContent="Connected";
   $("#tnRemoteHostList").innerHTML=hosts.length?hosts.map(x=>'<article class="ph-item"><div class="crew-admin-person"><div><strong>'+esc(x.on_air_name||x.name)+'</strong><div class="meta">'+esc(x.email||"No email") + " · " + esc(x.role||"Remote host")+' · '+esc(x.team_status||"active")+'</div></div><div class="crew-admin-actions"><button class="ph-btn" type="button" data-tn-host-edit="'+esc(x.id)+'">Edit</button><button class="ph-btn" type="button" data-tn-host-status="'+esc(x.id)+'" data-status="'+esc(x.team_status==="active"?"inactive":"active")+'">'+(x.team_status==="active"?"Deactivate":"Activate")+'</button></div></div></article>').join(""):'<p class="ph-small">No remote hosts have been added yet.</p>';
   $("#tnRemoteAvailabilityHost").innerHTML='<option value="">Choose a host…</option>'+hosts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.on_air_name||x.name)+'</option>').join("");
   const promotedIds=new Set(hosts.map(x=>String(x.crew_profile_id||"")).filter(Boolean));const eligibleCrew=crewMembers.filter(x=>!promotedIds.has(String(x.id)));const promoteSelect=$("#tnCrewPromoteSelect");if(promoteSelect){promoteSelect.innerHTML='<option value="">Choose a crew member…</option>'+eligibleCrew.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.display_name)+' · '+esc(x.role_title||"Crew member")+'</option>').join("");$("#tnCrewPromoteButton").disabled=!eligibleCrew.length;}
   const bannerSelect=$("#tnHeroCountHosts");if(bannerSelect){bannerSelect.innerHTML=hosts.map(x=>'<option value="'+esc(x.id)+'" '+(x.banner_count_enabled?"selected":"")+(x.team_status!=="active"?" disabled":"")+'>'+esc(x.on_air_name||x.name)+' · '+esc(x.team_status||"active")+(x.team_status!=="active"?" (inactive)":"")+(x.banner_count_enabled?" · included":"") +'</option>').join("");}
   const names=new Map(hosts.map(x=>[x.id,x.on_air_name||x.name]));
   $("#tnRemoteAvailabilityList").innerHTML=slots.length?slots.map(x=>'<article class="ph-item"><div class="crew-admin-person"><div><strong>'+esc(names.get(x.host_id)||"Unlisted host")+' · '+esc(days[Number(x.weekday)]||"Day")+'</strong><div class="meta">'+esc(x.start_time)+'–'+esc(x.end_time)+' · '+esc(x.timezone||"America/Los_Angeles")+(x.notes?' · '+esc(x.notes):"")+'</div></div><button class="ph-btn" type="button" data-tn-slot-delete="'+esc(x.id)+'">Remove</button></div></article>').join(""):'<p class="ph-small">No weekly availability has been recorded.</p>';
  }catch(e){say("Could not load remote host records: "+e.message);$("#tnRemoteRosterStatus").textContent="Needs attention";$("#tnRemoteHostList").innerHTML='<p class="ph-small">Remote host records could not be loaded. Check that the existing host tables and producer permissions are available.</p>'}
 }
 $("#tnCrewPromoteButton")?.addEventListener("click",async()=>{const select=$("#tnCrewPromoteSelect"),status=$("#tnCrewPromoteStatus"),button=$("#tnCrewPromoteButton"),crew=crewMembers.find(x=>String(x.id)===select.value);if(!crew){status.textContent="Choose a crew member first.";return}button.disabled=true;status.textContent="Adding crew member to host roster…";try{let email=null;if(crew.user_id){const {data:member,error:memberError}=await db.from("tn_production_profiles").select("email").eq("id",crew.user_id).maybeSingle();if(memberError)throw memberError;email=member?.email||null}const {error}=await db.from("tacoma_nights_remote_hosts").insert({crew_profile_id:crew.id,user_id:crew.user_id||null,name:crew.display_name,on_air_name:crew.display_name,email,role:crew.role_title||"Remote Host",team_status:"active",banner_count_enabled:false});if(error)throw error;status.textContent="Crew member is now an active remote host.";select.value="";await load()}catch(err){status.textContent="Could not promote crew member: "+err.message}finally{button.disabled=false}});
 $("#tnHeroCountSave")?.addEventListener("click",async()=>{const b=$("#tnHeroCountSave"),status=$("#tnHeroCountStatus"),selected=new Set([...$("#tnHeroCountHosts").selectedOptions].map(o=>o.value));b.disabled=true;status.textContent="Saving selection…";try{const active=hosts.filter(h=>h.team_status==="active");for(const h of active){const {error}=await db.from("tacoma_nights_remote_hosts").update({banner_count_enabled:selected.has(String(h.id))}).eq("id",h.id);if(error)throw error}status.textContent="Banner selection saved. Public count updates automatically.";await load()}catch(err){status.textContent="Could not save selection: "+err.message}finally{b.disabled=false}});
 $("#tnRemoteHostForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]');b.disabled=true;say("Saving host…");try{const d=Object.fromEntries(new FormData(f));d.email=String(d.email||"").trim().toLowerCase();if(!d.email){say("A contact email is required for every remote host.");return}const id=d.id;delete d.id;const q=id?db.from("tacoma_nights_remote_hosts").update(d).eq("id",id):db.from("tacoma_nights_remote_hosts").insert(d);const {error}=await q;if(error)throw error;reset();say("Host profile saved.");await load()}catch(err){say("Save failed: "+err.message)}finally{b.disabled=false}});
 $("#tnRemoteHostCancel").addEventListener("click",reset);
 $("#tnRemoteAvailabilityForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]'),d=Object.fromEntries(new FormData(f));if(d.end_time<=d.start_time){$("#tnRemoteAvailabilityStatus").textContent="End time must be later than start time.";return}b.disabled=true;$("#tnRemoteAvailabilityStatus").textContent="Saving availability…";try{const {error}=await db.from("tacoma_nights_host_availability").insert({...d,weekday:Number(d.weekday),notes:d.notes||null});if(error)throw error;f.reset();$("#tnRemoteAvailabilityStatus").textContent="Weekly availability saved.";await load()}catch(err){$("#tnRemoteAvailabilityStatus").textContent="Save failed: "+err.message}finally{b.disabled=false}});
 document.addEventListener("click",async e=>{
  const edit=e.target.closest("[data-tn-host-edit]");if(edit){const h=hosts.find(x=>String(x.id)===edit.dataset.tnHostEdit);if(!h)return;const f=$("#tnRemoteHostForm");Object.entries(h).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??""});$("#tnRemoteHostFormTitle").textContent="Edit remote host";f.scrollIntoView({behavior:"smooth",block:"center"});return}
  const status=e.target.closest("[data-tn-host-status]");if(status){status.disabled=true;try{const {error}=await db.from("tacoma_nights_remote_hosts").update({team_status:status.dataset.status}).eq("id",status.dataset.tnHostStatus);if(error)throw error;await load()}catch(err){say("Status update failed: "+err.message);status.disabled=false}return}
  const del=e.target.closest("[data-tn-slot-delete]");if(del){if(!confirm("Remove this recurring availability slot?"))return;del.disabled=true;const {error}=await db.from("tacoma_nights_host_availability").delete().eq("id",del.dataset.tnSlotDelete);if(error){say("Could not remove availability: "+error.message);del.disabled=false}else await load()}
 });
 await load();
}
document.addEventListener("DOMContentLoaded",()=>init().catch(e=>console.error("Remote host manager",e)));
})();