(() => {
  "use strict";
  const config = window.TACOMA_NIGHTS_CONFIG || {};
  const root = document.body.dataset.root || "./";
  const menus = [
    ["Home", "index.html"],
    ["Watch", [["Live Network","live/"],["Archived Episodes","episodes/"],["Watch on YouTube","watch.html"],["Programming Guide","network/schedule.html"]]],
    ["Explore", [["All Shows","shows/"],["Tacoma Nights","shows/detail.html?show=tacoma-nights"],["Back Deck Live","shows/detail.html?show=back-deck-live"],["The Weekly Lineup","sports/"],["Perspectives","perspectives/"],["Teenager Perspective","perspectives/teenager/"],["Cool Perspective","perspectives/cool/"],["People's Perspective","perspectives/peoples/"],["Originals","originals/"]]],
    ["Community", [["The 253","the-253/"],["Voice Wall","the-253/voice-wall/"],["Community Spotlight","the-253/spotlight/"],["Story Map","the-253/story-map/"],["Events","events/"],["Newsroom","newsroom/"],["Submit a Story","newsroom/submit/"]]],
    ["Participate", [["Free Membership","membership/"],["Member Sign In","membership/login/"],["Guest Lounge","guest-lounge/"],["Contributors","contributors/"],["Remote Host Application","remote-host.html"],["Share Your Perspective","people-perspective/"]]],
    ["Production", [["Public Production Updates","production-updates/"],["Production Hub · Approved Team","production/"]]],
    ["About", [["About Tacoma Nights","about/"],["Meet the Crew","crew/"],["Contact","contact/"],["CrowRules TV","https://www.youtube.com/@CrowRules_TV"]]]
  ];
  const pathFor = path => path.startsWith("http") ? path : root + path;
  const currentPath = href => { try { return new URL(href, location.href).pathname.replace(/index\\.html$/, "").replace(/\\/$/, "") || "/"; } catch { return ""; } };
  const nav = document.querySelector("#primary-nav");
  const menuButton = document.querySelector(".menu-toggle");
  if (nav) {
    nav.innerHTML = menus.map(([label, target]) => Array.isArray(target)
      ? '<details class="nav-menu"><summary>' + label + '</summary><div class="nav-dropdown">' + target.map(([name,path]) => '<a href="' + pathFor(path) + '">' + name + '</a>').join("") + '</div></details>'
      : '<a class="nav-link" href="' + pathFor(target) + '">' + label + '</a>').join("")
      + '<a class="nav-join" href="' + pathFor("membership/") + '">JOIN FREE ↗</a>';
    const here = currentPath(location.href);
    nav.querySelectorAll("a").forEach(link => {
      if (currentPath(link.href) === here) {
        link.setAttribute("aria-current", "page");
        const group = link.closest(".nav-menu");
        if (group) { group.classList.add("has-current"); group.querySelector("summary").setAttribute("aria-current", "page"); }
      }
      link.addEventListener("click", () => {
        if (innerWidth < 1101 && menuButton) { menuButton.setAttribute("aria-expanded","false"); nav.classList.remove("is-open"); }
      });
    });
    if (menuButton) menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      nav.classList.toggle("is-open", open);
    });
    document.addEventListener("click", event => {
      if (!nav.contains(event.target)) nav.querySelectorAll(".nav-menu[open]").forEach(item => item.open = false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        nav.querySelectorAll(".nav-menu[open]").forEach(item => item.open = false);
        if (menuButton) { menuButton.setAttribute("aria-expanded","false"); nav.classList.remove("is-open"); menuButton.focus(); }
      }
    });
  }
  document.querySelectorAll("[data-current-year]").forEach(node => { node.textContent = String(new Date().getFullYear()); });
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