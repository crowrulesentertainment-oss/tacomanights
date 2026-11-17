
(() => {
  "use strict";
  document.querySelectorAll("[data-current-year]").forEach(n=>n.textContent=String(new Date().getFullYear()));
  document.querySelectorAll("form[data-mailto-form]").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();const data=new FormData(form);const subject=encodeURIComponent(form.dataset.subject||"Tacoma Nights submission");const body=encodeURIComponent([...data.entries()].map(([k,v])=>k+": "+v).join("\n\n"));window.location.href="mailto:crowrulesentertainment@gmail.com?subject="+subject+"&body="+body;}));
})();
