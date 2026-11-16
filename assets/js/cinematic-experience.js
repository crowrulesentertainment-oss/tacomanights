/* Tacoma Nights cinematic homepage enhancements.
   No database writes, no new credentials, and no changes to existing Supabase flows. */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const goal = document.querySelector("[data-tn-goal-fill]");
  const note = document.querySelector("[data-tn-goal-note]");
  const progress = goal?.closest('[role="progressbar"]');
  const configuredCount = Number(window.TACOMA_NIGHTS_CONFIG?.youtubeSubscriberCount);
  const target = 1000;
  if (goal && Number.isFinite(configuredCount) && configuredCount >= 0) {
    const current = Math.min(configuredCount, target);
    goal.style.width = (current / target * 100) + "%";
    progress?.setAttribute("aria-valuenow", String(current));
    if (note) note.textContent = current.toLocaleString() + " subscribers · " + (target-current).toLocaleString() + " to go";
  }
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!reducedMotion && "IntersectionObserver" in window) {
    const sections = document.querySelectorAll("main > .section");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("tn-in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });
    sections.forEach(section => observer.observe(section));
  }
});
