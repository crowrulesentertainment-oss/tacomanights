document.addEventListener("DOMContentLoaded",()=>{
 const b=document.querySelector(".menu-toggle"),n=document.querySelector(".nav-links");
 b?.addEventListener("click",()=>{const v=n.classList.toggle("open");b.setAttribute("aria-expanded",String(v));});
 const y=document.querySelectorAll("[data-year]");y.forEach(x=>x.textContent=new Date().getFullYear());
});