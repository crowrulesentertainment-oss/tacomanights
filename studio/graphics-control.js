(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const modes = ["lower-third","next","schedule","full","breaking","guest","social","quote","score","countdown","logo"];
  const urls = Object.create(null);
  const channelName = "tacoma-nights-onair-graphics-v1";
  let client = null, channel = null, currentGraphic = null;
  const fields = () => ({
    mode: $("graphics-mode").value,
    title: $("graphic-title").value.trim(),
    subtitle: $("graphic-subtitle").value.trim(),
    kicker: $("graphic-kicker").value.trim(),
    host: $("graphic-host").value.trim(),
    color: $("graphic-color").value,
    secondary: $("graphic-secondary").value
  });
  function setText(id, value) { const e=$(id); if(e)e.textContent=value; }
  function buildGraphics() {
    for (const mode of modes.slice(0,4)) {
      const url=new URL("../network/overlay.html",window.location.href); url.searchParams.set("mode",mode); urls[mode]=url.href;
      setText(mode==="lower-third"?"url-lower":`url-${mode}`,url.href);
    }
    const preview=$("graphics-preview"), selector=$("graphics-mode");
    if(preview && selector) preview.src=new URL("../network/overlay.html?mode="+encodeURIComponent(selector.value),window.location.href).href;
  }
  function previewCommand(payload) {
    const frame=$("graphics-preview");
    try { frame?.contentWindow?.postMessage({type:"tacoma-graphics-command",payload},"*"); } catch {}
  }
  async function connectRealtime() {
    const config=window.TACOMA_NIGHTS_CONFIG||{};
    if(!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
      setText("graphics-state","CONFIGURATION MISSING"); setText("graphics-detail","Supabase browser configuration or client library did not load."); return;
    }
    try {
      client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
      channel=client.channel(channelName,{config:{broadcast:{self:false}}});
      await new Promise((resolve,reject)=>{
        channel.subscribe(status=>{
          if(status==="SUBSCRIBED"){setText("graphics-state","CONTROL CONNECTED");setText("graphics-detail","Connected. SHOW ON AIR and HIDE GRAPHIC control all connected graphics browser sources.");resolve();}
          if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){setText("graphics-state","CONNECTION ERROR");setText("graphics-detail","Realtime channel unavailable. Check that Supabase Realtime is enabled.");reject(new Error(status));}
        });
      });
    } catch(e) { setText("graphics-state","OFFLINE"); setText("graphics-detail",e.message||"Could not connect to graphics channel."); }
  }
  async function sendCommand(action) {
    const payload={action,graphic:action==="hide"?null:(currentGraphic||fields()),sentAt:new Date().toISOString()};
    previewCommand(payload);
    if(!channel){setText("graphics-state","NOT CONNECTED");setText("graphics-detail","The preview was updated locally, but on-air sources are not connected.");return;}
    try {
      const result=await channel.send({type:"broadcast",event:"graphics-command",payload});
      if(result!=="ok") throw new Error("Realtime command was not acknowledged.");
      setText("graphics-state",action==="hide"?"GRAPHIC HIDDEN":"GRAPHIC ON AIR");
      setText("graphics-detail",action==="hide"?"Hide command sent to connected browser sources.":"Graphic sent to connected browser sources.");
    } catch(e){setText("graphics-state","SEND FAILED");setText("graphics-detail",e.message||"Could not send graphics command.");}
  }
  function bindCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach(button=>button.addEventListener("click",async()=>{
      const source=$(button.dataset.copy);if(!source)return;
      try{await navigator.clipboard.writeText(source.textContent.trim());}catch{const t=document.createElement("textarea");t.value=source.textContent.trim();document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();}
      const old=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=old,1400);
    }));
  }
  document.addEventListener("DOMContentLoaded",()=>{
    buildGraphics();connectRealtime();bindCopyButtons();
    $("graphics-mode")?.addEventListener("change",()=>{buildGraphics();currentGraphic=fields();previewCommand({action:"preview",graphic:currentGraphic});});
    $("graphics-refresh")?.addEventListener("click",()=>{const f=$("graphics-preview");if(f)f.src="../network/overlay.html?mode="+encodeURIComponent($("graphics-mode").value)+"&refresh="+Date.now();});
    $("graphic-apply")?.addEventListener("click",()=>{currentGraphic=fields();previewCommand({action:"preview",graphic:currentGraphic});setText("graphics-detail","Edits applied to the preview. Select SHOW ON AIR to send them to the network.");});
    $("graphic-show")?.addEventListener("click",()=>{currentGraphic=fields();sendCommand("show");});
    $("graphic-hide")?.addEventListener("click",()=>sendCommand("hide"));
    $("graphic-reset")?.addEventListener("click",()=>{ $("graphic-title").value="Tacoma Nights";$("graphic-subtitle").value="One network. All day. All night.";$("graphic-kicker").value="CROW RULES ENTERTAINMENT PRESENTS";$("graphic-host").value="";$("graphic-color").value="#e74759";$("graphic-secondary").value="#e6bd70";currentGraphic=fields();previewCommand({action:"preview",graphic:currentGraphic});});
    ["graphic-title","graphic-subtitle","graphic-kicker","graphic-host","graphic-color","graphic-secondary"].forEach(id=>$(id)?.addEventListener("input",()=>{currentGraphic=fields();previewCommand({action:"preview",graphic:currentGraphic});}));
  });
})();