document.addEventListener("DOMContentLoaded",()=>{
 const nested=location.pathname.includes("/members/")||location.pathname.includes("/admin/");
 const base=nested?"../":"";
 const nav=document.querySelector(".nav-links");
 if(nav){
  nav.setAttribute("aria-label","Main navigation");
  nav.innerHTML='<a href="'+base+'index.html">Home</a>'+
   '<details class="nav-dropdown"><summary>Watch</summary><div class="dropdown-menu"><a href="'+base+'watch.html">Latest Episodes</a><a href="'+base+'watch.html#full-episodes">Full Episodes</a><a href="'+base+'watch.html#highlights">Video Highlights</a><a href="https://www.youtube.com/playlist?list=PLKfh6Jm08P-c" target="_blank" rel="noopener">YouTube Playlist ↗</a></div></details>'+
   '<details class="nav-dropdown"><summary>The Show</summary><div class="dropdown-menu"><a href="'+base+'about.html">About Tacoma Nights</a><a href="'+base+'shows.html">Shows &amp; Segments</a><a href="'+base+'explore.html">Explore Our Coverage</a></div></details>'+
   '<details class="nav-dropdown"><summary>Community</summary><div class="dropdown-menu"><a href="'+base+'community-voices.html">Community Voices</a><a href="'+base+'weekly-question.html">Weekly Question</a><a href="'+base+'shows.html#spotlight">253 Spotlight</a><a href="'+base+'shows.html#action">Community in Action</a></div></details>'+
   '<details class="nav-dropdown"><summary>Get Involved</summary><div class="dropdown-menu"><a href="'+base+'participate.html">Ways to Participate</a><a href="'+base+'community-voices.html">Submit a Story or Topic</a><a href="'+base+'participate.html#contributors">Become a Contributor</a><a href="'+base+'participate.html#guest">Become a Guest</a></div></details>'+
   '<details class="nav-dropdown"><summary>Members</summary><div class="dropdown-menu"><a href="'+base+'members/login.html">Member Sign In</a><a href="'+base+'members/dashboard.html">Member Dashboard</a></div></details>'+
   '<details class="nav-dropdown"><summary>Staff</summary><div class="dropdown-menu"><a href="'+base+'admin/">Staff Sign In</a><a href="'+base+'admin/command-center.html">Command Center</a></div></details>';
 }
 const b=document.querySelector(".menu-toggle");
 b?.addEventListener("click",()=>{const v=nav?.classList.toggle("open");b.setAttribute("aria-expanded",String(!!v));});
 document.querySelectorAll(".nav-dropdown").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)document.querySelectorAll(".nav-dropdown").forEach(other=>{if(other!==d)other.open=false;});}));
 document.querySelectorAll("[data-year]").forEach(x=>x.textContent=new Date().getFullYear());
 const current=location.pathname.split("/").pop()||"index.html";
 nav?.querySelectorAll("a[href]").forEach(a=>{try{const u=new URL(a.href,location.href);if(u.origin===location.origin&&u.pathname.split("/").pop()===current)a.setAttribute("aria-current","page");}catch{}});
});