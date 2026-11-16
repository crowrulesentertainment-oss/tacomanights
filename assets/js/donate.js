(() => {
const endpoint="https://cevylpnoexugwgygvtgu.supabase.co/functions/v1/create-donation-checkout";
const publicKey="sb_publishable_AdfM5y6RqvF3tbvEVzDZSg_JuGTQLD-";
const form=document.getElementById("donation-form"),message=document.getElementById("donation-message"),custom=document.getElementById("custom-amount"),submit=document.getElementById("donate-submit");
let frequency="one_time",selectedAmount=10;
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const amount=()=>custom.value.trim()!==""?Number(custom.value):selectedAmount;
function refresh(){const n=amount();submit.textContent="Continue to secure checkout · "+(Number.isFinite(n)&&n>0?money(n):"Choose amount");}
document.querySelectorAll("[data-frequency]").forEach(button=>button.addEventListener("click",()=>{frequency=button.dataset.frequency;document.querySelectorAll("[data-frequency]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));document.getElementById("email-note").textContent=frequency==="monthly"?"(required for monthly support)":"(optional for one-time support)";refresh();}));
document.querySelectorAll("[data-amount]").forEach(button=>button.addEventListener("click",()=>{selectedAmount=Number(button.dataset.amount);custom.value="";document.querySelectorAll("[data-amount]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));refresh();}));
custom.addEventListener("input",()=>{document.querySelectorAll("[data-amount]").forEach(b=>b.setAttribute("aria-pressed","false"));refresh();});
form.addEventListener("submit",async event=>{
event.preventDefault();message.classList.remove("show");
const value=amount(),email=document.getElementById("donor-email").value.trim(),name=document.getElementById("donor-name").value.trim();
if(!Number.isFinite(value)||value<1||value>1000000){message.textContent="Enter an amount between $1 and $1,000,000.";message.classList.add("show");return;}
if(frequency==="monthly"&&!email){message.textContent="Please enter your email address for monthly support.";message.classList.add("show");document.getElementById("donor-email").focus();return;}
if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message.textContent="Please enter a valid email address.";message.classList.add("show");return;}
submit.disabled=true;submit.textContent="Connecting to secure checkout…";
try{
const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":publicKey},body:JSON.stringify({amount_cents:Math.round(value*100),donation_type:frequency,donor_email:email,donor_name:name,campaign:"Tacoma Nights",success_url:new URL("donation-success.html",location.href).toString(),cancel_url:new URL("donate.html?canceled=1",location.href).toString()})});
const data=await response.json();if(!response.ok||!data.checkout_url)throw new Error(data.error||"Checkout could not be started. Please try again.");location.assign(data.checkout_url);
}catch(error){message.textContent=error.message||"Something went wrong. Please try again.";message.classList.add("show");submit.disabled=false;refresh();}
});
if(new URLSearchParams(location.search).get("canceled")==="1"){message.textContent="Your checkout was canceled. No payment was made. You can change your amount or try again whenever you're ready.";message.classList.add("show");}
refresh();
})();