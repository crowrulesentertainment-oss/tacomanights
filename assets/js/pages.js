
(() => {
  "use strict";
  const menuButton=document.querySelector(".menu-toggle"),nav=document.querySelector("#primary-nav");
  if(menuButton&&nav){menuButton.addEventListener("click",()=>{const open=menuButton.getAttribute("aria-expanded")==="true";menuButton.setAttribute("aria-expanded",String(!open));nav.classList.toggle("is-open",!open)});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{menuButton.setAttribute("aria-expanded","false");nav.classList.remove("is-open")}));}
  document.querySelectorAll("[data-current-year]").forEach(n=>n.textContent=String(new Date().getFullYear()));
  document.querySelectorAll("form[data-mailto-form]").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();const data=new FormData(form);const subject=encodeURIComponent(form.dataset.subject||"Tacoma Nights submission");const body=encodeURIComponent([...data.entries()].map(([k,v])=>k+": "+v).join("\n\n"));window.location.href="mailto:crowrulesentertainment@gmail.com?subject="+subject+"&body="+body;}));
})();
