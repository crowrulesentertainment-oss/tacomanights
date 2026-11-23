(()=>{"use strict";
const $=id=>document.getElementById(id),base="http://127.0.0.1:8787";
let bridgeToken=sessionStorage.getItem("tn_bridge_token")||"",lastHealth=null,refreshBusy=false;
const headers=()=>({"Content-Type":"application/json",...(bridgeToken?{Authorization:"Bearer "+bridgeToken}:{})});
const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
async function api(path,body){
 const r=await fetch(base+path,{method:body?"POST":"GET",headers:headers(),cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||"Bridge request failed ("+r.status+")");
 return d;
}
async function getYouTubeStatus(){\n try{const y=await api("/youtube/status");setText("youtube-output-status",y.status||"NOT VERIFIED");setText("youtube-output-detail",y.title?y.title+" · "+(y.message||""):y.message||"No YouTube status returned.");const el=$("youtube-output-status");if(el)el.dataset.status=String(y.status||"").toLowerCase();return y}catch(e){setText("youtube-output-status","UNAVAILABLE");setText("youtube-output-detail",e.message);return null}\n}\nasync function getHealth(){
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
  renderNetwork(h,queued);\n  await getYouTubeStatus();
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
  setText("bridge-message","Supabase session paired. "+engine+" connection requested.");
  await refresh();
  if(!lastHealth?.connected)throw Error("The bridge paired, but the selected encoder did not confirm a connection. Check the local bridge terminal and engine settings.");
 }catch(e){setText("bridge-message","Connection failed: "+e.message);await refresh()}
 finally{if(button)button.disabled=false}
}
async function runCommand(button){
 if(!bridgeToken){setText("bridge-message","Connect the local bridge first.");return}
 if(lastHealth&&!lastHealth.sessionPaired){setText("bridge-message","The local bridge is not paired to your signed-in account. Reconnect first.");return}
 const[type,rawValue]=button.dataset.command.split(":");
 const value=rawValue==="custom"?$("scene-name").value.trim():rawValue;
 if(type==="scene"&&!value){setText("bridge-message","Enter a scene name.");return}
 button.disabled=true;
 try{const d=await api("/command",{type,value,engine:$("engine-select").value});setText("bridge-message",d.message||"Command sent successfully.");await refresh()}
 catch(e){setText("bridge-message","Command failed: "+e.message)}
 finally{button.disabled=false}
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
 $("connect-bridge")?.addEventListener("click",connectBridge);\n $("connect-youtube")?.addEventListener("click",()=>{window.location.href=base+"/youtube/auth"});\n $("check-youtube")?.addEventListener("click",()=>getYouTubeStatus());
 document.querySelectorAll("[data-command]").forEach(button=>button.addEventListener("click",()=>runCommand(button)));
 auth.client.auth.onAuthStateChange(()=>{refresh().catch(e=>setText("data-error",e.message))});
 await refresh();
 if(bridgeToken&&auth.getSession()){
  try{await auth.pairBridge(bridgeToken);setText("bridge-message","Saved local bridge session restored.");await refresh()}
  catch(e){setText("bridge-message","Bridge session restore failed: "+e.message)}
 }
 window.setInterval(()=>refresh().catch(e=>setText("data-error",e.message)),20000);
}
window.TNStudioReady?start().catch(e=>{setText("data-error",e.message);console.error(e)}):window.addEventListener("load",()=>start().catch(e=>{setText("data-error",e.message);console.error(e)}));
})();