(() => {
  "use strict";
  const config = window.TACOMA_NIGHTS_CONFIG || {};
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    }));
  }

  document.querySelectorAll("[data-current-year]").forEach(node => {
    node.textContent = String(new Date().getFullYear());
  });

  // Until a trusted server-side YouTube count endpoint is connected, show the
  // explicitly labelled starting count rather than pretending it is live.
  const count = Number(config.initialSubscriberCount ?? 821);
  let goal = Number(config.initialSubscriberGoal ?? 1000);
  if (!Number.isFinite(count) || count < 0) return;
  if (!Number.isFinite(goal) || goal <= count) goal = Math.floor(count / 1000) * 1000 + 1000;
  const countNode = document.querySelector("[data-subscriber-count]");
  const targetNode = document.querySelector("[data-subscriber-target]");
  const progressNode = document.querySelector("[data-subscriber-progress]");
  const remainingNode = document.querySelector("[data-subscriber-remaining]");
  if (countNode) countNode.textContent = count.toLocaleString();
  if (targetNode) targetNode.textContent = goal.toLocaleString();
  if (progressNode) progressNode.style.width = Math.min(100, count / goal * 100) + "%";
  if (remainingNode) remainingNode.textContent = Math.max(0, goal - count).toLocaleString() + " to the next milestone";
})();
