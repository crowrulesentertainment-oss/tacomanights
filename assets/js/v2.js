(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{},db=window.supabase?.createClient&&cfg.supabaseUrl&&cfg.supabaseAnonKey?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const showData={
"tacoma-nights":{title:"Tacoma Nights",tag:"FLAGSHIP · COMMUNITY & CULTURE",tagline:"Real conversations. Local voices. A city with stories to tell.",heading:"The city. The people. The stories.",description:"A community-centered television program exploring life, mental health, business-building, Tacoma and Pacific Northwest stories, sports, advice and the people shaping the 253. The show begins in Tacoma and welcomes perspectives from everywhere.",hosts:"Jonathan Riehle · Triton Peterson · Kenneth WarnerShook · Additional community guests and contributors",segments:"Main Conversation · The Teenager Perspective · The Weekly Lineup · 253 Spotlight · Tacoma Then & Now · Neighbor’s Mic · The People’s Perspective",cta:"../people-perspective/"},
"back-deck-live":{title:"Back Deck Live",tag:"LIVE CONVERSATION · COMMUNITY",tagline:"Good conversations. Real people. A place to pull up a chair.",heading:"A relaxed seat at the table.",description:"A live conversation series bringing together guests, community voices and current topics in a welcoming Pacific Northwest setting.",hosts:"Jonathan Riehle · Invited guests and community contributors",segments:"Opening conversation · Guest spotlight · Community discussion · Audience questions",cta:"../guest-lounge/"},
"weekly-lineup":{title:"The Weekly Lineup",tag:"SPORTS · ANALYSIS & OPINION",tagline:"The games, the teams and the conversations around them.",heading:"The week in sports.",description:"A recurring sports segment covering national sports, Washington teams and Pacific Northwest perspectives with commentary, analysis and fan conversation.",hosts:"Kenneth WarnerShook · Additional sports contributors",segments:"National headlines · Washington and PNW teams · Game reactions · Fan questions",cta:"../sports/"},
"teenager-perspective":{title:"The Teenager Perspective",tag:"YOUTH VOICE · NEXT GENERATION",tagline:"A younger voice. A wider view.",heading:"Tomorrow has a voice.",description:"A youth-focused perspective on life, school, sports, community and the issues affecting the next generation.",hosts:"Triton Peterson · Youth guests and contributors",segments:"Youth questions · School and community · Sports · Life and tomorrow",cta:"../perspectives/teenager/"},
"cool-perspective":{title:"The Cool Perspective",tag:"CULTURE · ENTERTAINMENT",tagline:"Culture, entertainment and conversation without the filter.",heading:"What's shaping culture?",description:"A space for entertainment, trends, music, movies and the conversations surrounding popular culture.",hosts:"CrowRules contributors and invited guests",segments:"Entertainment headlines · Music and movies · Trends · Audience picks",cta:"../perspectives/cool/"},
"peoples-perspective":{title:"The People's Perspective",tag:"COMMUNITY VOICES · QUESTION OF THE WEEK",tagline:"One question. Many lived experiences.",heading:"Your voice belongs in the conversation.",description:"A weekly community question answered by real people through video, audio, photo and written responses. Every submission is reviewed before publication.",hosts:"Tacoma residents, community contributors and Tacoma Nights producers",segments:"Question of the Week · Video responses · Audio voices · Photo stories · Selected episode features",cta:"../people-perspective/"}
};
function showDetail(){const host=$("#tn2-show-title");if(!host)return;const key=new URLSearchParams(location.search).get("show")||"tacoma-nights",s=showData[key]||showData["tacoma-nights"];host.textContent=s.title;$("#tn2-show-tagline").textContent=s.tagline;$("#tn2-show-category").textContent=s.tag;$("#tn2-show-heading").textContent=s.heading;$("#tn2-show-description").textContent=s.description;$("#tn2-show-hosts").textContent=s.hosts;$("#tn2-show-segments").textContent=s.segments;const c=document.querySelector(".tn2-actions");if(c){const a=document.createElement("a");a.className="tn2-btn tn2-btn-outline";a.href=s.cta;a.textContent="Participate ↗";c.append(a)}document.title=s.title+" | Tacoma Nights"}
function addNav(){}
async function weeklyQuestion(){const host=$("[data-tn2-question]");if(!host||!db)return;try{const{data,error}=await db.from("tn_weekly_questions").select("id,question,context,closes_at,episode_slug").eq("status","active").order("opens_at",{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(data){host.innerHTML='<span class="tn2-eyebrow">THE PEOPLE’S PERSPECTIVE · QUESTION OF THE WEEK</span><h3>'+esc(data.question)+'</h3><p>'+esc(data.context||"Share your perspective with Tacoma Nights.")+'</p><a class="tn2-link" href="'+(document.body.dataset.root||"./")+'people-perspective/?question='+encodeURIComponent(data.id)+'">Share your answer ↗</a>'}}catch(e){console.info("Weekly question feed unavailable until the 2.0 migration is applied.",e)}}
async function crew(){
const host=$("[data-tn2-crew]");if(!host||!db)return;
const directory=$("#crew-directory-view"),profileView=$("#crew-profile-view"),search=$("#crew-search"),count=$("#crew-count");
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}};
const profileId=new URLSearchParams(location.search).get("profile");
try{
 let query=db.from("tacoma_nights_crew").select("id,display_name,role_title,bio,avatar_url,profile_url,sort_order,is_featured,specialties,volunteer_status,compensation_disclosure,portrait_approved,public_name_approved,links_approved").eq("is_published",true).eq("public_name_approved",true).order("sort_order").order("display_name");
 if(profileId)query=query.eq("id",profileId);
 const{data,error}=await query.limit(60);if(error)throw error;
 const people=data||[];
 const initials=name=>String(name||"TN").split(/\\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 const tagsHtml=tags=>(Array.isArray(tags)&&tags.length?'<div class="crew-tags">'+tags.map(t=>'<span class="crew-tag">'+esc(t)+'</span>').join("")+'</div>':"");
 const photo=(p)=>{const url=p.portrait_approved?safeUrl(p.avatar_url):null;return '<div class="crew-photo">'+(url?'<img loading="lazy" src="'+esc(url)+'" alt="'+esc(p.display_name)+'">':'<div class="crew-photo-placeholder">'+esc(initials(p.display_name))+'</div>')+'</div>'};
 if(profileId){
  if(directory)directory.hidden=true;if(profileView)profileView.hidden=false;
  const p=people[0];
  if(!p){profileView.innerHTML='<div class="crew-empty"><h2>Profile unavailable</h2><p>This profile is not currently published for public viewing.</p><a class="crew-action" href="./">← BACK TO CREW</a></div>';return}
  const external=p.links_approved?safeUrl(p.profile_url):null;
  profileView.innerHTML='<article class="crew-profile"><div class="crew-profile-head">'+photo(p)+'<div class="crew-profile-copy"><p class="crew-kicker">TACOMA NIGHTS CREW PROFILE</p><h2>'+esc(p.display_name)+'</h2><p class="crew-role">'+esc(p.role_title||"Tacoma Nights Contributor")+'</p><p>'+(p.volunteer_status==="volunteer"?"Currently contributing as a volunteer.":"Part of the Tacoma Nights creative team.")+'</p><a class="crew-action" href="./">← ALL CREW PROFILES</a>'+(external?' <a class="crew-action secondary" href="'+esc(external)+'" target="_blank" rel="noopener noreferrer">PUBLIC LINK ↗</a>':"")+'</div></div><div class="crew-profile-content"><h3>About</h3><p class="crew-bio">'+esc(p.bio||"More about this contributor will be shared as their profile is completed.")+'</p>'+(Array.isArray(p.specialties)&&p.specialties.length?'<h3>Specialties &amp; interests</h3>'+tagsHtml(p.specialties):"")+'<div class="crew-disclosure">'+esc(p.compensation_disclosure||"Tacoma Nights is built through volunteer and community collaboration.")+'</div></div></article>';
  document.title=p.display_name+" | Tacoma Nights Crew";return;
 }
 if(directory)directory.hidden=false;if(profileView)profileView.hidden=true;
 if(!people.length){host.innerHTML='<div class="crew-empty"><h3>Profiles are being prepared.</h3><p>Public crew profiles will appear here as contributors complete their profile and publication permissions.</p></div>';if(count)count.textContent="No approved public profiles are available right now.";return}
 const render=()=>{const term=(search?.value||"").trim().toLowerCase(),shown=people.filter(p=>!term||[p.display_name,p.role_title,p.bio,...(p.specialties||[])].join(" ").toLowerCase().includes(term));host.innerHTML=shown.map(p=>'<article class="crew-card"><div class="crew-photo">'+photo(p).replace(/^<div class="crew-photo">|<\\/div>$/g,"")+'</div><div class="crew-card-body"><h3>'+esc(p.display_name)+'</h3><p class="crew-role">'+esc(p.role_title||"Tacoma Nights Contributor")+'</p><p class="crew-bio">'+esc(p.bio||"A member of the Tacoma Nights team, bringing their perspective and creativity to the show.")+'</p>'+tagsHtml(p.specialties)+'<div class="crew-actions"><a class="crew-action" href="?profile='+encodeURIComponent(p.id)+'">VIEW PROFILE ↗</a>'+(p.links_approved&&safeUrl(p.profile_url)?'<a class="crew-action secondary" href="'+esc(safeUrl(p.profile_url))+'" target="_blank" rel="noopener noreferrer">PUBLIC LINK ↗</a>':"")+'</div></div></article>').join("")||'<div class="crew-empty">No crew profiles match that search. Try another name or specialty.</div>';if(count)count.textContent=shown.length+" approved public profile"+(shown.length===1?"":"s")+" · Tacoma Nights production team";};
 render();if(search)search.addEventListener("input",render);
}catch(e){console.warn("Crew directory could not be loaded.",e);host.innerHTML='<div class="crew-empty">The crew directory is temporarily unavailable. Please refresh the page later.</div>';if(count)count.textContent="Crew profiles could not be loaded."}
}
async function submitPerspective(form){
const status=form.querySelector(".tn2-status"),uploadStatus=form.querySelector("[data-tn2-upload-status]"),d=new FormData(form),file=form.elements.media?.files?.[0]||null,type=d.get("media_type"),questionId=d.get("question_id")||null;
let bucketPath=null;
if(!db){status.textContent="Secure submissions are not configured. Please try again later.";return}
if(!d.get("consent")){status.textContent="Please confirm the permission statement before submitting.";return}
const limits={video:50*1024*1024*1024,audio:30*1024*1024,photo:15*1024*1024},mimes={video:["video/mp4","video/webm","video/quicktime","video/x-m4v"],audio:["audio/mpeg","audio/mp4","audio/wav","audio/webm","audio/ogg"],photo:["image/jpeg","image/png","image/webp"]};
if(type!=="written"){
 if(!file){status.textContent="Choose a file for your "+type+" response.";return}
 if(!mimes[type]?.includes(file.type)){status.textContent="That file format is not supported for this response type.";return}
 if(file.size>limits[type]){const limitLabel=type==="video"?"50 GB":(limits[type]/1024/1024)+" MB";status.textContent="This file is larger than the "+limitLabel+" limit for this format.";return}
}
const submitButton=form.querySelector('button[type="submit"]');if(submitButton)submitButton.disabled=true;
status.textContent="Preparing your submission…";
try{
 if(file){
  const{data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session?.user?.id)throw new Error("Sign in to your Tacoma Nights account before uploading media. You can still submit a written response without a file.");
  if(!window.tus?.Upload)throw new Error("The resumable upload service did not load. Refresh the page and try again.");
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-90),path=session.user.id+"/incoming/"+crypto.randomUUID()+"-"+safe;
  const projectRef=new URL((window.TACOMA_NIGHTS_CONFIG||{}).supabaseUrl).hostname.split(".")[0];
  const endpoint="https://"+projectRef+".storage.supabase.co/storage/v1/upload/resumable";
  status.textContent="Uploading your private media…";
  if(uploadStatus)uploadStatus.textContent="Starting secure resumable upload. Keep this page open; interrupted uploads can be resumed by selecting the same file again.";
  await new Promise((resolve,reject)=>{
   const upload=new window.tus.Upload(file,{
    endpoint,retryDelays:[0,3000,5000,10000,20000],
    headers:{authorization:"Bearer "+session.access_token,apikey:(window.TACOMA_NIGHTS_CONFIG||{}).supabaseAnonKey},
    metadata:{bucketName:"tn-community-perspective-private",objectName:path,contentType:file.type,cacheControl:"3600"},
    chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
    onError:reject,
    onProgress:(uploaded,total)=>{const pct=total?Math.min(100,uploaded/total*100):0;const mb=(uploaded/1024/1024).toFixed(1),totalMb=(total/1024/1024).toFixed(1);status.textContent="Uploading media: "+pct.toFixed(1)+"%";if(uploadStatus)uploadStatus.textContent="Private upload progress: "+pct.toFixed(1)+"% ("+mb+" / "+totalMb+" MB)."},
    onSuccess:()=>resolve()
   });
   upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start()}).catch(reject);
  });
  bucketPath=path;
 }
 const metadata={category:"peoples_perspective",question_id:questionId,media_type:type,storage_bucket:bucketPath?"tn-community-perspective-private":null,object_path:bucketPath,original_filename:file?.name||null,mime_type:file?.type||null,file_size_bytes:file?.size||null,permission_to_review_and_consider_publication:true,guardian_consent:d.get("guardian_consent")==="on",contact_permission:d.get("contact_permission")==="on",review_status:"pending",submitted_at:new Date().toISOString()};
 status.textContent="Sending your response to the production review queue…";
 const{error}=await db.from("tn_submissions").insert({submission_type:"community-submit",submitter_name:d.get("name")||"",submitter_email:d.get("email")||"",title:d.get("title")||"People’s Perspective response",message:d.get("message")||"Community media submission",metadata,status:"pending"});
 if(error)throw error;
 form.reset();if(uploadStatus)uploadStatus.textContent="Written responses do not need a file. Video files are stored privately and only production reviewers can access them.";
 status.textContent="Thank you. Your response is now in the Tacoma Nights production team's private review queue. It will not be published unless selected and approved.";
}catch(e){console.error(e);status.textContent=e.message||"We couldn't complete the submission. Please try again later."}
finally{if(submitButton)submitButton.disabled=false}
}
function initForm(){const f=$("[data-tn2-perspective-form]");if(!f)return;f.addEventListener("submit",e=>{e.preventDefault();submitPerspective(f)});const type=f.elements.media_type,file=f.elements.media;type?.addEventListener("change",()=>{const v=type.value;file.accept=v==="video"?"video/mp4,video/webm,video/quicktime":v==="audio"?"audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg":v==="photo"?"image/jpeg,image/png,image/webp":"";file.disabled=v==="written";file.required=v!=="written"})}
async function populateQuestion(){const f=$("[data-tn2-perspective-form]");if(!f||!db)return;try{const{data}=await db.from("tn_weekly_questions").select("id,question").eq("status","active").order("opens_at",{ascending:false}).limit(1).maybeSingle();if(data){f.elements.question_id.value=data.id;const q=$("#tn2-active-question");if(q)q.textContent=data.question}}catch(e){console.info(e)}}
document.addEventListener("DOMContentLoaded",()=>{weeklyQuestion();crew();showDetail();initForm();populateQuestion()});
})();