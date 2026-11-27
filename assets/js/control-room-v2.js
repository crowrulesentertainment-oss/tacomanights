(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{},db=window.__tnSupabaseClient||(window.supabase?.createClient&&cfg.supabaseUrl&&cfg.supabaseAnonKey?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],node=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n;};
const say=(el,msg)=>{if(el)el.textContent=msg;};
async function init(){
 const root=$(".cr2");if(!root)return;
 if(!db){say($("[data-cr2-global-status]"),"Supabase is unavailable. Check the public configuration.");return}
 try{
  const {data:sessionData,error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;
  const user=sessionData.session?.user;if(!user){say($("[data-cr2-global-status]"),"Sign in with an authorized Tacoma Nights account to manage the site.");return}
  const {data:membership,error:membershipError}=await db.from("tn_memberships").select("display_name,role,status").eq("user_id",user.id).maybeSingle();
  if(membershipError)throw membershipError;
  if(!membership||membership.status!=="active"||!["administrator","producer","editor","moderator"].includes(membership.role)){say($("[data-cr2-global-status]"),"This account does not have active Tacoma Nights management permissions.");return}
  say($("[data-cr2-global-status]"),"Signed in as "+(membership.display_name||user.email)+" · "+membership.role+". Database permissions are still enforced for each workspace.");
  await Promise.allSettled([loadContent(),loadSettings(),loadVideo("tn_homepage_featured_video"),loadVideo("tn_homepage_hero_video")]);
  wireContent(user);wireSettings();wireVideo(user);wirePageEditor();
 }catch(e){say($("[data-cr2-global-status]"),"Access check failed: "+(e.message||"Please reload and try again."));}
}
async function loadContent(){
 const list=$("[data-cr2-content-list]"),count=$("[data-cr2-content-count]");if(!list)return;
 list.textContent="Loading content…";
 const {data,error}=await db.from("tn_content").select("id,content_type,slug,title,excerpt,body,image_url,video_url,status").order("created_at",{ascending:false}).limit(100);
 if(error){list.textContent="Content library unavailable: "+error.message;return}
 say(count,String(data?.length||0));list.replaceChildren();
 if(!data?.length){list.append(node("p","No content records yet.","cr2-muted"));return}
 for(const item of data){
  const card=node("article",undefined,"cr2-item"),top=node("div"),tag=node("span",item.content_type||"content","cr2-pill"),title=node("h3",item.title||"Untitled"),meta=node("p",(item.slug||"no-slug")+" · "+(item.status||"draft"));
  top.append(tag);card.append(top,title,meta);
  if(item.excerpt)card.append(node("p",item.excerpt));
  const actions=node("div",undefined,"cr2-actions"),edit=node("button","Edit"),toggle=node("button",item.status==="published"?"Unpublish":"Publish"),archive=node("button","Archive");
  edit.type=toggle.type=archive.type="button";
  edit.addEventListener("click",()=>fillContent(item));
  toggle.addEventListener("click",async()=>{toggle.disabled=true;const next=item.status==="published"?"draft":"published";const patch={status:next,published_at:next==="published"?new Date().toISOString():null};const r=await db.from("tn_content").update(patch).eq("id",item.id);toggle.disabled=false;if(r.error){say($("[data-cr2-content-status]"),r.error.message);return}say($("[data-cr2-content-status]"),"Publication status updated.");await loadContent()});
  archive.addEventListener("click",async()=>{if(!confirm("Archive “"+(item.title||"this content")+"”?"))return;archive.disabled=true;const r=await db.from("tn_content").update({status:"archived",published_at:null}).eq("id",item.id);archive.disabled=false;if(r.error){say($("[data-cr2-content-status]"),r.error.message);return}say($("[data-cr2-content-status]"),"Content archived.");await loadContent()});
  actions.append(edit,toggle,archive);card.append(actions);list.append(card);
 }
}
function fillContent(item){
 const f=$("[data-cr2-content-form]");if(!f)return;
 for(const key of ["id","content_type","slug","title","excerpt","body","image_url","video_url","status"])if(f.elements[key])f.elements[key].value=item[key]??"";
 say($("[data-cr2-content-status]"),"Editing: "+item.title);f.scrollIntoView({behavior:"smooth",block:"start"});
}
function wireContent(user){
 const f=$("[data-cr2-content-form]");if(!f)return;
 f.addEventListener("submit",async e=>{
  e.preventDefault();const b=f.querySelector('button[type="submit"]'),status=$("[data-cr2-content-status]");b.disabled=true;say(status,"Saving…");
  const d=Object.fromEntries(new FormData(f));const id=d.id;const publish=d.status==="published";
  const record={content_type:d.content_type,slug:d.slug,title:d.title,excerpt:d.excerpt||"",body:d.body||"",image_url:d.image_url||null,video_url:d.video_url||null,status:d.status,created_by:user.id,published_at:publish?new Date().toISOString():null,updated_at:new Date().toISOString()};
  const r=id?await db.from("tn_content").update(record).eq("id",id):await db.from("tn_content").insert(record);
  b.disabled=false;if(r.error){say(status,"Save failed: "+r.error.message);return}
  f.reset();f.elements.id.value="";say(status,id?"Changes saved.":"New content created.");await loadContent();
 });
 const reset=$("[data-cr2-reset]");reset?.addEventListener("click",()=>{f.reset();f.elements.id.value="";say($("[data-cr2-content-status]"),"Form cleared.")});
}
async function loadSettings(){
 const list=$("[data-cr2-settings-list]");if(!list)return;list.textContent="Loading settings…";
 const {data,error}=await db.from("tacoma_nights_site_settings").select("setting_key,setting_value,updated_at").order("setting_key").limit(150);
 if(error){list.textContent="Site settings unavailable: "+error.message;return}
 list.replaceChildren();if(!data?.length){list.append(node("p","No site settings have been saved yet.","cr2-muted"));return}
 for(const item of data){const card=node("article",undefined,"cr2-item"),key=node("h3",item.setting_key),value=node("p",item.setting_value),actions=node("div",undefined,"cr2-actions"),edit=node("button","Edit");edit.type="button";edit.addEventListener("click",()=>{const f=$("[data-cr2-setting-form]");f.elements.setting_key.value=item.setting_key;f.elements.setting_value.value=item.setting_value;f.scrollIntoView({behavior:"smooth",block:"center"})});actions.append(edit);card.append(key,value,actions);list.append(card)}
}
function wireSettings(){
 const f=$("[data-cr2-setting-form]");if(!f)return;
 f.addEventListener("submit",async e=>{e.preventDefault();const b=f.querySelector('button[type="submit"]'),status=f.querySelector('[role="status"]');b.disabled=true;say(status,"Saving site setting…");
 const d=Object.fromEntries(new FormData(f));const r=await db.from("tacoma_nights_site_settings").upsert({setting_key:d.setting_key.trim(),setting_value:d.setting_value,updated_at:new Date().toISOString()},{onConflict:"setting_key"});
 b.disabled=false;if(r.error){say(status,"Save blocked: "+r.error.message);return}say(status,"Setting saved. Pages that read this key will use the new value.");await loadSettings();
 });
}
async function loadVideo(table){
 const f=$('[data-cr2-video-form="'+table+'"]');if(!f)return;
 const {data,error}=await db.from(table).select("id,youtube_video_id,title,description,is_active").eq("id",1).maybeSingle();
 if(error){say(f.querySelector('[role="status"]'),"Read unavailable: "+error.message);return}
 if(data){f.elements.youtube_video_id.value=data.youtube_video_id||"";f.elements.title.value=data.title||"";f.elements.description.value=data.description||"";f.elements.is_active.checked=!!data.is_active}
}
function wirePageEditor(){
 const f=$("[data-cr2-page-form]");if(!f)return;
 f.addEventListener("submit",async e=>{
  e.preventDefault();const b=f.querySelector('button[type="submit"]'),status=f.querySelector('[role="status"]');b.disabled=true;say(status,"Saving page text…");
  const d=Object.fromEntries(new FormData(f));let path=d.page_path.trim();
  if(!path.startsWith("/"))path="/"+path;
  if(!path.endsWith("/"))path+="/";
  if(path.includes("..")||path.includes("?")||path.includes("#")){b.disabled=false;say(status,"Enter a site-relative page path without query strings.");return}
  const selector=d.selector.trim();try{document.querySelector(selector)}catch{b.disabled=false;say(status,"That CSS selector is not valid.");return}
  const key="page:"+path+":"+selector;
  const r=await db.from("tacoma_nights_site_settings").upsert({setting_key:key,setting_value:d.setting_value,updated_at:new Date().toISOString()},{onConflict:"setting_key"});
  b.disabled=false;if(r.error){say(status,"Save blocked: "+r.error.message);return}
  say(status,"Page text saved. Visitors will see it after the page refreshes.");
  const current=location.pathname.replace(/index\.html$/,"").replace(/\/{2,}/g,"/");
  if(current===path){try{document.querySelectorAll(selector).forEach(el=>{if(!/^(SCRIPT|STYLE|INPUT|TEXTAREA|SELECT)$/i.test(el.tagName))el.textContent=d.setting_value})}catch{}}
  await loadSettings();
 });
}
function wireVideo(user){
 all("[data-cr2-video-form]").forEach(f=>f.addEventListener("submit",async e=>{
  e.preventDefault();const table=f.dataset.cr2VideoForm,b=f.querySelector('button[type="submit"]'),status=f.querySelector('[role="status"]');b.disabled=true;say(status,"Saving…");
  const d=Object.fromEntries(new FormData(f));const videoId=(d.youtube_video_id||"").trim().replace(/^.*(?:youtu\.be\/|v=|embed\/|shorts\/)/,"").split(/[?&/]/)[0];
  if(!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)){b.disabled=false;say(status,"Enter a valid YouTube video ID or YouTube URL.");return}
  const record={id:1,youtube_video_id:videoId,title:d.title,description:d.description||"",is_active:f.elements.is_active.checked,updated_by:user.id,updated_at:new Date().toISOString()};
  const r=await db.from(table).upsert(record,{onConflict:"id"});b.disabled=false;
  if(r.error){say(status,"Save blocked by database permissions: "+r.error.message);return}
  say(status,"Video setting saved.");await loadVideo(table);
 }));
}
init();
})();