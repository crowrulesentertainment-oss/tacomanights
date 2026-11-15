document.addEventListener("DOMContentLoaded",()=>{
 const form=document.querySelector("[data-tn-submission]");
 if(!form)return;
 const status=form.querySelector(".status");
 const videoInput=form.querySelector("#weeklyVideo");
 const videoRights=form.querySelector("#videoRights");
 const progress=form.querySelector("#videoProgress");
 const progressBar=form.querySelector("#videoProgressBar");
 const uploadStatus=form.querySelector("#videoUploadStatus");
 const MAX_BYTES=50*1024*1024*1024;
 const PROJECT_ID="cevylpnoexugwgygvtgu";
 const BUCKET="tacoma-nights-clips";
 const TABLE="tacoma_nights_clip_uploads";
 const SUPABASE_KEY=window.TACOMA_NIGHTS_CONFIG?.supabaseKey;
 const setUploadStatus=(message,isError=false)=>{if(uploadStatus){uploadStatus.textContent=message;uploadStatus.style.color=isError?"#ffb4ae":"";}};
 async function uploadWeeklyVideo(file){
  if(!window.tus?.Upload)throw new Error("The video upload service did not load. Refresh and try again.");
  if(!SUPABASE_KEY)throw new Error("The secure upload configuration is unavailable.");
  const ext=file.name.toLowerCase().split(".").pop();
  const types={mp4:"video/mp4",mov:"video/quicktime",webm:"video/webm"};
  if(!types[ext]||!(file.type.startsWith("video/")||!file.type))throw new Error("Choose an MP4, MOV, or WebM video.");
  if(file.size<1||file.size>MAX_BYTES)throw new Error("The video is empty or exceeds the 50 GB per-file limit.");
  const mime=types[ext],safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100);
  let storagePath="public-inbox/"+crypto.randomUUID()+"-"+safeName;
  progress.style.display="block";progressBar.style.width="0%";setUploadStatus("Preparing secure video upload…");
  await new Promise((resolve,reject)=>{
   let settled=false;const finish=error=>{if(settled)return;settled=true;error?reject(error):resolve();};
   const upload=new tus.Upload(file,{
    endpoint:"https://"+PROJECT_ID+".storage.supabase.co/storage/v1/upload/resumable",
    retryDelays:[0,3000,5000,10000,20000,30000,60000,120000],
    headers:{apikey:SUPABASE_KEY},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,
    metadata:{bucketName:BUCKET,objectName:storagePath,contentType:mime,cacheControl:"3600"},
    onError:error=>finish(new Error("Video upload interrupted. "+(error?.message||"Please try again."))),
    onProgress:(uploaded,total)=>{const pct=total?Math.min(99,Math.round(uploaded/total*100)):0;progressBar.style.width=pct+"%";setUploadStatus("Uploading video… "+pct+"%");},
    onSuccess:async()=>{
     try{
      const subject=form.querySelector('[name="subject"]').value.trim();
      const message=form.querySelector('[name="message"]').value.trim();
      const {error}=await window.tnSupabase.from(TABLE).insert({
       owner_id:null,co_host_name:form.querySelector('[name="full_name"]').value.trim(),
       co_host_email:form.querySelector('[name="email"]').value.trim()||null,
       title:subject,episode_label:"The People's Perspective — Question of the Week",
       notes:["Weekly question: "+document.querySelector("#weeklyQuestionHeading")?.textContent,message].filter(Boolean).join("\n\n"),
       storage_path:storagePath,original_filename:file.name,file_size:file.size,mime_type:mime,rights_confirmed:true
      });
      if(error){await window.tnSupabase.storage.from(BUCKET).remove([storagePath]);throw error;}
      finish();
     }catch(error){finish(new Error("The video uploaded, but its production review record could not be saved: "+(error.message||"unknown error")));}
    }
   });
   upload.findPreviousUploads().then(previous=>{const prior=previous.find(item=>item.metadata?.bucketName===BUCKET&&item.metadata?.objectName);if(prior){storagePath=prior.metadata.objectName;upload.resumeFromPreviousUpload(prior);setUploadStatus("Resuming the previous video upload…");}upload.start();}).catch(finish);
  });
  progressBar.style.width="100%";setUploadStatus("Video securely delivered to the Tacoma Nights production inbox.");
  return storagePath;
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!window.tnSupabase){status.textContent="Submission service unavailable. Please try again later.";return;}
  const file=videoInput?.files?.[0]||null;
  if(file&&!videoRights?.checked){setUploadStatus("Please confirm you have permission to share this video.",true);return;}
  const button=form.querySelector('[type="submit"]');
  button.disabled=true;status.textContent=file?"Uploading your video securely…":"Sending your answer…";
  try{
   let videoPath=null;
   if(file)videoPath=await uploadWeeklyVideo(file);
   const f=new FormData(form);
   const p={
    submission_type:f.get("submission_type"),
    full_name:String(f.get("full_name")||"").trim(),
    email:String(f.get("email")||"").trim(),
    organization:String(f.get("organization")||"").trim()||null,
    interest_area:String(f.get("interest_area")||"").trim()||null,
    portfolio_url:String(f.get("portfolio_url")||"").trim()||null,
    subject:String(f.get("subject")||"").trim(),
    message:String(f.get("message")||"").trim()+(videoPath?"\n\nVideo response uploaded to the private Tacoma Nights production inbox. Reference: "+videoPath:""),
    consent_to_contact:f.get("consent_to_contact")==="on",status:"new"
   };
   const allowed=["crew_interest","guest_pitch","story_pitch","topic_suggestion","episode_question"];
   if(!allowed.includes(p.submission_type)||!p.full_name||!p.email||!p.subject||!p.message||!p.consent_to_contact)throw new Error("Complete the required fields and contact consent.");
   const {error}=await window.tnSupabase.from("tacoma_nights_submissions").insert(p);
   if(error)throw error;
   form.reset();status.textContent=file?"Thank you. Your answer and video have been sent to Tacoma Nights for production review.":"Thank you. Your submission has been received for review.";
   if(progress)progress.style.display="none";
   setUploadStatus("");
  }catch(error){console.error(error);status.textContent=error.message||"We couldn't submit that right now. Please try again later.";}
  finally{button.disabled=false;}
 });
});