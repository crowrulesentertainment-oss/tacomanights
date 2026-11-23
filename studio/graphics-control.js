(()=>{"use strict";
const $=id=>document.getElementById(id),channelName="tacoma-nights-onair-graphics-v1";
let client=null,channel=null,hideTimer=null,design=null;
const presets={
"lower-third":["NOW PLAYING · TACOMA NIGHTS NETWORK","Tacoma Nights","Live from Tacoma, Washington"],
"next":["COMING UP NEXT","Next Program","Starting soon"],
"schedule":["ON THE NETWORK","Tonight on Tacoma Nights","Stay with us"],
"full":["CROW RULES ENTERTAINMENT PRESENTS","Tacoma Nights","One network. All day. All night."],
"breaking":["BREAKING NEWS","Important Update","Developing story from Tacoma and the South Sound"],
"guest":["SPECIAL GUEST","Guest Name","Conversation · Tacoma, Washington"],
"social":["FOLLOW THE CONVERSATION","Find CrowRules Online","Visit our website and join the community"],
"quote":["COMMUNITY VOICES","“Your quote goes here.”","Name · Tacoma, Washington"],
"score":["GAME DAY","HOME 00  —  AWAY 00","League · Matchup · Period"],
"countdown":["COMING SOON","00:00:00","The next big moment starts here"],
"logo":["CROW RULES ENTERTAINMENT","TACOMA NIGHTS","ONE NETWORK. ALL DAY. ALL NIGHT."],
"weather":["TACOMA WEATHER","Current Conditions","Temperature · Forecast · Updated"],
"event":["COMMUNITY CALENDAR","Event Name","Date · Time · Location"],
"announcement":["ANNOUNCEMENT","Your headline here","Important information for our community"],
"poll":["YOUR VOICE MATTERS","Audience Poll","Question · Vote options"],
"sponsor":["PROUDLY SUPPORTED BY","Sponsor Name","Thank you for supporting local storytelling"],
"headline":["TACOMA / PIERCE COUNTY","News Headline","More information at CrowRules Entertainment"],
"full-banner":["SPECIAL ANNOUNCEMENT","Your message here","CrowRules Entertainment"],
"side-panel":["ON THE RADAR","Your information","Details and links"],
"thankyou":["THANK YOU FOR WATCHING","Tacoma Nights","Until next time · CrowRules Entertainment"]
};
const ids=["mode","kicker","title","subtitle","extra","host","footer","badge","color","secondary","background","textColor","opacity","font","width","height","x","y","size","align","animation","duration","corners","border"];
const map={mode:"graphics-mode",kicker:"graphic-kicker",title:"graphic-title",subtitle:"graphic-subtitle",extra:"graphic-extra",host:"graphic-host",footer:"graphic-footer",badge:"graphic-badge",color:"graphic-color",secondary:"graphic-secondary",background:"graphic-background",textColor:"graphic-text-color",opacity:"graphic-opacity",font:"graphic-font",width:"graphic-width",height:"graphic-height",x:"graphic-x",y:"graphic-y",size:"graphic-size",align:"graphic-align",animation:"graphic-animation",duration:"graphic-duration",corners:"graphic-corners",border:"graphic-border"};
const defaults={mode:"lower-third",kicker:"CROW RULES ENTERTAINMENT",title:"Tacoma Nights",subtitle:"One network. All day. All night.",extra:"",host:"",footer:"",badge:"",color:"#e74759",secondary:"#e6bd70",background:"#080d16",textColor:"#ffffff",opacity:92,font:"Arial,Helvetica,sans-serif",width:91,height:180,x:4.5,y:78,size:58,align:"left",animation:"fade",duration:0,corners:"square",border:"accent"};
const read=()=>Object.fromEntries(ids.map(k=>{const e=$(map[k]);return[k,e?e.value:defaults[k]];}));
function write(d){const v={...defaults,...d};ids.forEach(k=>{const e=$(map[k]);if(e)e.value=v[k];});updateOutputs();design=read();preview();}
function updateOutputs(){for(const [id,source,suffix] of [["opacity-value","graphic-opacity","%"],["width-value","graphic-width","%"],["height-value","graphic-height","px"],["x-value","graphic-x","%"],["y-value","graphic-y","%"],["size-value","graphic-size","px"]]){const e=$(id),input=$(source);if(e&&input)e.textContent=input.value+suffix;}}
function setStatus(a,b){$("graphics-state").textContent=a;$("graphics-detail").textContent=b;}
function previewCommand(payload){try{$("graphics-preview")?.contentWindow?.postMessage({type:"tacoma-graphics-command",payload},"*");}catch{}}
function preview(){design=read();previewCommand({action:"preview",graphic:design});}
async function connect(){const c=window.TACOMA_NIGHTS_CONFIG||{};if(!window.supabase?.createClient||!c.supabaseUrl||!c.supabaseAnonKey){setStatus("CONFIGURATION MISSING","Supabase client or browser-safe project configuration did not load.");return;}
try{client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);channel=client.channel(channelName,{config:{broadcast:{self:false}}});await new Promise((resolve,reject)=>{channel.subscribe(s=>{if(s==="SUBSCRIBED"){setStatus("CONTROL CONNECTED","Ready. Connected graphics sources will receive your commands.");resolve();}if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")reject(Error(s));});});}catch(e){setStatus("OFFLINE","Realtime connection failed: "+e.message);}}
async function send(action){const graphic=action==="hide"?null:read();if(action==="show"){previewCommand({action:"show",graphic});const secs=Number(graphic.duration)||0;if(hideTimer)clearTimeout(hideTimer);if(secs>0)hideTimer=setTimeout(()=>send("hide"),secs*1000);}
if(action==="hide"){if(hideTimer)clearTimeout(hideTimer);previewCommand({action:"hide"});}
if(!channel){setStatus("NOT CONNECTED","Preview updated locally, but remote browser sources are not connected.");return;}
try{const result=await channel.send({type:"broadcast",event:"graphics-command",payload:{action,graphic,sentAt:new Date().toISOString()}});if(result!=="ok")throw Error("No broadcast acknowledgement");setStatus(action==="hide"?"GRAPHIC HIDDEN":"GRAPHIC ON AIR",action==="hide"?"Hide command sent to connected sources.":"Graphic sent to connected sources.");}catch(e){setStatus("SEND FAILED",e.message);}}
function loadPreset(){const mode=$("graphics-mode").value,p=presets[mode]||presets["lower-third"];write({...defaults,mode,kicker:p[0],title:p[1],subtitle:p[2]});}
function saveFile(){const blob=new Blob([JSON.stringify(read(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="tacoma-nights-graphic-design.json";a.click();URL.revokeObjectURL(url);}
function loadFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);write(data);setStatus("DESIGN LOADED","Your editable graphic design has been loaded.");}catch{setStatus("INVALID DESIGN","That file is not a valid Tacoma Nights graphics design JSON.");}};reader.readAsText(file);}
function bindCopy(){document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{const e=$(b.dataset.copy);if(!e)return;try{await navigator.clipboard.writeText(e.textContent.trim());b.textContent="Copied";setTimeout(()=>b.textContent="Copy URL",1200);}catch{setStatus("COPY BLOCKED","Select and copy the URL manually.");}}));}
document.addEventListener("DOMContentLoaded",()=>{
 write(defaults);
 const url=new URL("../network/overlay.html",location.href);url.searchParams.set("mode","lower-third");$("url-lower").textContent=url.href;
 const full=new URL(url);full.searchParams.set("mode","full");$("url-full").textContent=full.href;
 $("graphics-mode").addEventListener("change",loadPreset);
 ids.filter(k=>k!=="mode").forEach(k=>$(map[k])?.addEventListener("input",()=>{updateOutputs();preview();}));
 ids.filter(k=>["align","animation","font","corners","border"].includes(k)).forEach(k=>$(map[k])?.addEventListener("change",preview));
 $("graphic-apply").addEventListener("click",()=>{preview();setStatus("PREVIEW UPDATED","Your changes are visible in the preview. Select SHOW ON AIR to broadcast them.");});
 $("graphic-show").addEventListener("click",()=>send("show"));$("graphic-hide").addEventListener("click",()=>send("hide"));
 $("graphic-reset").addEventListener("click",loadPreset);$("graphic-save").addEventListener("click",saveFile);
 $("graphic-load").addEventListener("change",e=>loadFile(e.target.files?.[0]));
 $("graphics-refresh").addEventListener("click",()=>{const f=$("graphics-preview");if(f)f.src="../network/overlay.html?mode="+encodeURIComponent($("graphics-mode").value)+"&refresh="+Date.now();});
 $("graphic-opacity").addEventListener("input",updateOutputs);
 ["graphic-width","graphic-height","graphic-x","graphic-y","graphic-size"].forEach(id=>$(id).addEventListener("input",updateOutputs));
 bindCopy();connect();
});
})();