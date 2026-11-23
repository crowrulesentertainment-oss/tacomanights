(()=>{"use strict";
const cfg=window.TACOMA_NIGHTS_CONFIG||{},base="http://127.0.0.1:8787";
let client=null,session=null,pairToken=sessionStorage.getItem("tn_bridge_token")||"",lastPairedAccessToken="",pairInFlight=null,pairInFlightToken="";
const $=id=>document.getElementById(id);
const ready=(async()=>{
 if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw Error("Supabase browser configuration is missing");
 client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const s=await client.auth.getSession();session=s.data.session;render();
 client.auth.onAuthStateChange((_event,sess)=>{
  session=sess;render();
  if(!sess?.access_token){lastPairedAccessToken="";return}
  if(pairToken&&sess.access_token!==lastPairedAccessToken)pair(sess.access_token).catch(e=>console.warn("Bridge session refresh failed",e));
 });
 return{client,getSession:()=>session,pairBridge:setPairToken,bridgeUrl:base};
})();
function render(){
 const state=$("auth-state"),form=$("studio-login"),out=$("studio-signout");
 if(state)state.textContent=session?"Signed in: "+(session.user.email||"CrowRules account"):"Sign in with your existing CrowRules Supabase account";
 if(form)form.hidden=!!session;if(out)out.hidden=!session;
 document.querySelectorAll("[data-requires-auth]").forEach(el=>el.hidden=!session);
}
async function setPairToken(token){
 const next=token||"";
 if(next!==pairToken){pairToken=next;lastPairedAccessToken="";}
 if(pairToken)sessionStorage.setItem("tn_bridge_token",pairToken);else sessionStorage.removeItem("tn_bridge_token");
 if(session?.access_token&&pairToken)return pair(session.access_token);
 return null;
}
async function pair(accessToken){
 if(!pairToken)throw Error("Local bridge token is missing. Connect the bridge again.");
 if(lastPairedAccessToken===accessToken)return{paired:true,alreadyPaired:true};
 if(pairInFlight&&pairInFlightToken===accessToken)return pairInFlight;
 pairInFlightToken=accessToken;
 pairInFlight=(async()=>{
  const r=await fetch(base+"/session",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+pairToken},body:JSON.stringify({access_token:accessToken,refresh_token:session?.refresh_token,expires_at:session?.expires_at})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"Could not pair local bridge ("+r.status+")");
  lastPairedAccessToken=accessToken;return data;
 })();
 try{return await pairInFlight}finally{pairInFlight=null;pairInFlightToken=""}
}
document.addEventListener("DOMContentLoaded",()=>{
 $("studio-login")?.addEventListener("submit",async e=>{
  e.preventDefault();const msg=$("auth-message");msg.textContent="Signing in…";
  try{const{error}=await client.auth.signInWithPassword({email:$("studio-email").value.trim(),password:$("studio-password").value});if(error)throw error;msg.textContent="Signed in."}
  catch(err){msg.textContent=err.message}
 });
 $("studio-signout")?.addEventListener("click",async()=>{
  const{error}=await client.auth.signOut({scope:"local"});if(error){$("auth-message").textContent=error.message;return}
  session=null;lastPairedAccessToken="";render();
 });
});
window.TNStudioReady=ready;window.TNStudioAuth={get client(){return client},get session(){return session},setPairToken,bridgeUrl:base};
})();