(()=>{"use strict";
const $=id=>document.getElementById(id),base="http://127.0.0.1:8787";
let bridgeToken=sessionStorage.getItem("tn_bridge_token")||"",lastHealth=null,refreshBusy=false,previewBusy=false;
const headers=()=>({"Content-Type":"application/json",...(bridgeToken?{Authorization:"Bearer "+bridgeToken}:{})});
const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
async function api(path,body){
 const r=await fetch(base+path,{method:body?"POST":"GET",headers:headers(),cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||"Bridge request failed ("+r.status+")");
 return d;
}
async function loadScenes(){
 const select=$("scene-select"),engine=$("engine-select")?.value||"obs";if(!select)return;
 select.disabled=true;select.innerHTML="<option value=\"\">Loading scenes…</option>";
 try{const data=await api("/scenes?engine="+encodeURIComponent(engine));const names=(data.scenes||[]).map(x=>x.name).filter(Boolean);
  select.innerHTML="";if(!names.length){select.add(new Option("No scenes returned", ""));setText("bridge-message","Connected to "+engine+", but no scenes were returned by the desktop app.");return}
  names.forEach(name=>select.add(new Option(name,name)));const preferred=names.find(x=>x.toLowerCase()==="network main")||names[0];select.value=preferred;setText("bridge-message",names.length+" scenes loaded from "+(engine==="streamlabs"?"Streamlabs Desktop":"OBS Studio")+".");
 }catch(e){select.innerHTML="";select.add(new Option("Unable to load scenes", ""));setText("bridge-message","Scene list unavailable: "+e.message)}
 finally{select.disabled=false}
}
async function getYouTubeStatus(){
 try{
  const y=await api("/youtube/status");
  setText("youtube-output-status",y.status||"NOT VERIFIED");
  setText("youtube-output-detail",y.title?y.title+" · "+(y.message||""):y.message||"No YouTube status returned.");
  const el=$("youtube-output-status");if(el)el.dataset.status=String(y.status||"").toLowerCase();
  const auth=await window.TNStudioReady,session=auth.getSession();
  if(session?.user){
   const publicVideoId=y.status==="LIVE"&&y.privacyStatus==="public"?y.videoId:null;
   const update=await auth.client.from("live_network_public_state").update({youtube_video_id:publicVideoId,youtube_channel_id:window.TACOMA_NIGHTS_CONFIG?.youtubeChannelId||null}).eq("owner_id",session.user.id);
   if(update.error)throw update.error;
   setText("youtube-output-detail",(y.message||"YouTube status checked.")+(publicVideoId?" Public live feed synced to Network.":" Public Network feed will not expose this test/private broadcast."));
  }
  return y;
 }catch(e){setText("youtube-output-status","UNAVAILABLE");setText("youtube-output-detail",e.message);return null}
}
async function getHealth(){
 const r=await fetch(base+"/health",{headers:headers(),cache:"no-store"});
 const h=await r.json().catch(()=>({}));
 if(!r.ok||!h.ok)throw Error(h.error||"Local bridge is not responding.");
 lastHealth=h;
 setText("bridge-health",h.sessionPaired?"PAIRED":h.ok?"ONLINE":"OFFLINE");
 setText("engine-status","ENGINE: "+String(h.engine||"UNKNOWN").toUpperCase()+(h.connected?" CONNECTED":" OFFLINE"));
 setText("active-engine",h.engine||"—");
 setText("monitor-message",h.playout|| (h.connected?"BRIDGE READY":"ENGINE OFFLINE"));
 const engineSelect=$("engine-select");if(engineSelect&&h.engine)engineSelect.value=h.engine;
 return h;
}
async function refreshMasterPreview(h){
 const image=$("master-preview-image"),placeholder=$("master-preview-placeholder"),sceneLabel=$("preview-scene-label"),detail=$("monitor-preview-detail");
 if(!image||previewBusy)return;
 if(!h?.connected){image.hidden=true;if(placeholder)placeholder.hidden=false;if(sceneLabel)sceneLabel.hidden=true;setText("monitor-message","AWAITING BRIDGE");if(detail)detail.textContent="Connect the broadcast computer and OBS to display its current program output.";return}
 if(h.engine!=="obs"){image.hidden=true;if(placeholder)placeholder.hidden=false;if(sceneLabel)sceneLabel.hidden=true;setText("monitor-message","STREAMLABS CONNECTED");if(detail)detail.textContent="Streamlabs controls are connected. Use the Streamlabs Desktop Preview window for local visual monitoring; this bridge does not expose its frame feed.";return}
 previewBusy=true;
 try{const shot=await api("/preview/screenshot");if(shot.image){image.src=shot.image;image.hidden=false;if(placeholder)placeholder.hidden=true;if(sceneLabel){sceneLabel.textContent="OBS · "+(shot.scene||"PROGRAM");sceneLabel.hidden=false}setText("monitor-message","LIVE LOCAL PREVIEW");if(detail)detail.textContent="OBS program output · refreshed automatically. YouTube transmission is verified separately."}}
 catch(e){image.hidden=true;if(placeholder)placeholder.hidden=false;setText("monitor-message","PREVIEW UNAVAILABLE");if(detail)detail.textContent=e.message}
 finally{previewBusy=false}
}
function renderNetwork(h,queued){
 const paired=!!(h?.ok&&h.sessionPaired),connected=!!(h?.ok&&h.connected);
 const status=paired&&connected?"ONLINE":paired?"BRIDGE PAIRED · ENGINE OFFLINE":h?.ok?"BRIDGE ONLINE · NOT PAIRED":"OFFLINE";
 setText("network-status",status+" · "+queued+" QUEUED");
 const el=$("network-status");if(el)el.title="Bridge: "+(h?.ok?"reachable":"unavailable")+"; Supabase session: "+(paired?"paired":"not paired")+"; encoder: "+(connected?"connected":"disconnected")+". YouTube output is verified separately in YouTube Studio.";
}
async function refresh(){
 if(refreshBusy)return;refreshBusy=true;
 try{
  let queued=0;const auth=await window.TNStudioReady,session=auth.getSession();
  if(session?.user){
   try{
    const[q,stateResult]=await Promise.all([
     auth.client.from("live_network_playout_queue").select("id",{count:"exact",head:true}).eq("status","queued"),
     auth.client.from("live_network_public_state").select("*").maybeSingle()
    ]);
    if(q.error)throw q.error;queued=q.count||0;if(stateResult.error)throw stateResult.error;
    const state=stateResult.data;
    if(state){
     setText("scheduler-health","CONNECTED");setText("data-error","");
     setText("active-program",state.current_program_title||"No program loaded");
     const toggle=$("publish-toggle");if(toggle){toggle.hidden=false;toggle.textContent=state.is_published?"Unpublish public status":"Publish public status";toggle.dataset.published=String(!!state.is_published)}
    }else{
     setText("scheduler-health","NO NETWORK STATE");const toggle=$("publish-toggle");if(toggle)toggle.hidden=true;
     setText("active-program","No program loaded");setText("data-error","No network-state row is associated with this account. Sign in with the network owner account; the Studio will not create a duplicate row.");
    }
   }catch(e){setText("scheduler-health","ERROR");setText("data-error","Supabase scheduler: "+e.message)}
  }else{
   setText("scheduler-health","SIGN IN REQUIRED");const toggle=$("publish-toggle");if(toggle)toggle.hidden=true;
  }
  let h;try{h=await getHealth()}catch(e){lastHealth=null;h={ok:false,connected:false,sessionPaired:false};setText("bridge-health","OFFLINE");setText("engine-status","ENGINE: NOT CONNECTED");setText("active-engine","—");setText("monitor-message","AWAITING BRIDGE");}
  renderNetwork(h,queued);
  await refreshMasterPreview(h);
  await getYouTubeStatus();
 }catch(e){setText("scheduler-health","ERROR");setText("data-error",e.message)}
 finally{refreshBusy=false}
}
async function connectBridge(){
 const auth=await window.TNStudioReady;
 if(!auth.getSession()){setText("bridge-message","Sign in to Supabase first.");return}
 const token=prompt("Enter the local BRIDGE_TOKEN from bridge/.env. It is stored only in this browser tab.");
 if(!token||token.length<32){setText("bridge-message","A valid local bridge token is required.");return}
 const button=$("connect-bridge");if(button)button.disabled=true;
 bridgeToken=token;sessionStorage.setItem("tn_bridge_token",token);
 try{
  await auth.pairBridge(token);
  const engine=$("engine-select").value;
  await api("/command",{type:"engine:connect",engine});
  await loadScenes();
  setText("bridge-message","Supabase session paired. "+engine+" connection requested.");
  await refresh();
  if(!lastHealth?.connected)throw Error("The bridge paired, but the selected encoder did not confirm a connection. Check the local bridge terminal and engine settings.");
 }catch(e){setText("bridge-message","Connection failed: "+e.message);await refresh()}
 finally{if(button)button.disabled=false}
}
async function runCommand(button){
 if(button.dataset.command==="stream:stop"&&!confirm("Stop the active encoder stream? This ends the outgoing OBS/Streamlabs stream. Continue?"))return;
 if(button.dataset.command==="stream:start"&&!confirm("Start streaming now? Confirm the correct scene, audio, destination and YouTube Live Control Room are ready."))return;
 if(!bridgeToken){setText("bridge-message","Connect the local bridge first.");return}
 if(lastHealth&&!lastHealth.sessionPaired){setText("bridge-message","The local bridge is not paired to your signed-in account. Reconnect first.");return}
 if(!lastHealth?.ok||!lastHealth?.sessionPaired){setText("bridge-message","The bridge must be online and paired to your signed-in account before sending encoder commands.");return}
 const[type,rawValue]=button.dataset.command.split(":");
 const value=rawValue==="select"?$("scene-select")?.value:rawValue;
 const commandType=(type==="stream"||type==="record")?type+":"+rawValue:type;
 if(type==="scene"&&!value){setText("bridge-message","Select a scene from the connected encoder first.");return}
 button.disabled=true;
 try{const d=await api("/command",{type:commandType,value,engine:$("engine-select").value});setText("bridge-message",d.message||"Command sent successfully.");await refresh()}
 catch(e){setText("bridge-message","Command failed: "+e.message)}
 finally{button.disabled=false}
}
async function loadRundown(){
 const list=$("rundown-list");if(!list)return;const auth=await window.TNStudioReady,session=auth.getSession();if(!session?.user){list.textContent="Sign in to view the private network schedule.";return}
 const now=new Date().toISOString();
 try{
  const [current,next]=await Promise.all([
   auth.client.from("live_network_schedule").select("id,starts_at,ends_at,status,host_name,is_public,live_network_programs(title,format)").eq("owner_id",session.user.id).in("status",["scheduled","ready","on_air"]).lte("starts_at",now).gt("ends_at",now).order("starts_at",{ascending:false}).limit(1),
   auth.client.from("live_network_schedule").select("id,starts_at,ends_at,status,host_name,is_public,live_network_programs(title,format)").eq("owner_id",session.user.id).in("status",["scheduled","ready"]).gt("starts_at",now).order("starts_at",{ascending:true}).limit(3)
  ]);
  if(current.error)throw current.error;if(next.error)throw next.error;
  const rows=[...(current.data||[]).map(x=>({...x,_slot:"ON AIR"})),...(next.data||[]).map((x,i)=>({...x,_slot:i===0?"UP NEXT":"LATER"}))];list.replaceChildren();
  if(!rows.length){list.textContent="No current or upcoming schedule entries. Add a program in Programming.";return}
  for(const row of rows){const program=Array.isArray(row.live_network_programs)?row.live_network_programs[0]:row.live_network_programs;const card=document.createElement("article");card.className="rundown-row";const tag=document.createElement("span");tag.textContent=row._slot;const title=document.createElement("strong");title.textContent=program?.title||"Untitled program";const meta=document.createElement("small");meta.textContent=new Date(row.starts_at).toLocaleString()+" – "+new Date(row.ends_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+" · "+(row.host_name||"Host not assigned")+" · "+(row.is_public?"Public":"Private");card.append(tag,title,meta);list.append(card)}
  setText("rundown-message","Showing "+rows.length+" current/upcoming schedule entries. Times use your browser's local timezone.");
 }catch(e){list.textContent="Schedule could not be loaded.";setText("rundown-message","Programming data: "+e.message)}
}
async function loadQueueSnapshot(){
 const auth=await window.TNStudioReady,session=auth.getSession();if(!session?.user){setText("queue-snapshot-list","Sign in to view the queue.");return}
 try{
  const r=await auth.client.from("live_network_playout_queue").select("id,title,status,approved,scheduled_at").eq("owner_id",session.user.id).in("status",["queued","playing"]).order("queue_position",{ascending:true,nullsFirst:true}).order("scheduled_at",{ascending:true,nullsFirst:true}).limit(8);if(r.error)throw r.error;
  const rows=r.data||[],queued=rows.filter(x=>x.status==="queued"),playing=rows.filter(x=>x.status==="playing"),approval=queued.filter(x=>!x.approved);
  setText("queue-pending-count",String(queued.length));setText("queue-playing-count",String(playing.length));setText("queue-approval-count",String(approval.length));
  const list=$("queue-snapshot-list");if(!list)return;list.replaceChildren();if(!rows.length){list.textContent="No queued or playing items.";return}
  for(const item of rows){const row=document.createElement("div");row.className="queue-snapshot-item";const name=document.createElement("strong");name.textContent=item.title||"Untitled item";const meta=document.createElement("small");meta.textContent=item.status.toUpperCase()+" · "+(item.approved?"Approved":"Awaiting approval")+" · "+(item.scheduled_at?new Date(item.scheduled_at).toLocaleString():"Immediate");row.append(name,meta);list.append(row)}
 }catch(e){setText("queue-snapshot-list","Queue unavailable: "+e.message)}
}

async function start(){
 const auth=await window.TNStudioReady;
 $("publish-toggle")?.addEventListener("click",async()=>{
  const button=$("publish-toggle");button.disabled=true;
  try{
   const next=button.dataset.published!=="true",result=await auth.client.from("live_network_public_state").update({is_published:next,network_name:"Tacoma Nights Network"}).eq("owner_id",auth.getSession()?.user?.id);
   if(result.error)throw result.error;setText("data-error","");await refresh();
  }catch(e){setText("data-error",e.message)}
  finally{button.disabled=false}
 });
 $("connect-bridge")?.addEventListener("click",connectBridge);
 $("refresh-scenes")?.addEventListener("click",loadScenes);
 $("engine-select")?.addEventListener("change",()=>{const select=$("scene-select");if(select){select.disabled=true;select.innerHTML="<option value=\"\">Connect selected encoder to load scenes</option>"}setText("bridge-message","Selected engine changed. Connect the selected encoder, then refresh its scene list.")});
 $("connect-youtube")?.addEventListener("click",()=>{window.location.href=base+"/youtube/auth"});
 $("check-youtube")?.addEventListener("click",()=>getYouTubeStatus());
 $("refresh-rundown")?.addEventListener("click",loadRundown);
 $("refresh-queue-snapshot")?.addEventListener("click",loadQueueSnapshot);
 document.querySelectorAll("[data-command]").forEach(button=>button.addEventListener("click",()=>runCommand(button)));
 auth.client.auth.onAuthStateChange(()=>{refresh().catch(e=>setText("data-error",e.message));loadRundown();loadQueueSnapshot()});
 await refresh();await Promise.all([loadRundown(),loadQueueSnapshot()]);
 window.setInterval(()=>refreshMasterPreview(lastHealth),2500);
 if(bridgeToken&&auth.getSession()){
  try{await auth.pairBridge(bridgeToken);setText("bridge-message","Saved local bridge session restored.");await refresh()}
  catch(e){setText("bridge-message","Bridge session restore failed: "+e.message)}
 }
 window.setInterval(()=>{refresh().catch(e=>setText("data-error",e.message));loadRundown();loadQueueSnapshot()},20000);
}
window.TNStudioReady?start().catch(e=>{setText("data-error",e.message);console.error(e)}):window.addEventListener("load",()=>start().catch(e=>{setText("data-error",e.message);console.error(e)}));
})();