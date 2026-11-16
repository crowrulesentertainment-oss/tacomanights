document.addEventListener("DOMContentLoaded", () => {
  const nested = location.pathname.includes("/members/") || location.pathname.includes("/admin/");
  const base = nested ? "../" : "";
  const nav = document.querySelector(".nav-links");
  if (nav) {
    nav.setAttribute("aria-label", "Main navigation");
    nav.innerHTML =
      '<a class="nav-home" href="' + base + 'index.html">Home</a>' +
      '<details class="nav-dropdown"><summary>Archive</summary><div class="dropdown-menu"><a href="' + base + 'archive.html">Full Episode Archive</a><a href="https://www.youtube.com/playlist?list=PLKfh6Jm08P-c" target="_blank" rel="noopener">YouTube Playlist ↗</a></div></details>' +
      '<details class="nav-dropdown"><summary>The Show</summary><div class="dropdown-menu"><a href="' + base + 'about.html">About Tacoma Nights</a><a href="' + base + 'shows.html">Shows &amp; Segments</a><a href="' + base + 'future-segments.html">Future Segments</a><a href="' + base + 'explore.html">Explore Our Coverage</a></div></details>' +
      '<details class="nav-dropdown"><summary>Community</summary><div class="dropdown-menu"><a href="' + base + 'community.html">Community Hub</a><a href="' + base + 'community.html#forum">Message Board</a><a href="' + base + 'community.html#polls">Community Polls</a><a href="' + base + 'community.html#spotlight">People’s Spotlight</a><a href="' + base + 'community.html#calendar">Community Calendar</a><a href="' + base + 'weekly-question.html">Weekly Question</a><a href="' + base + 'people-mic.html">The People’s Mic Studio</a></div></details>' +
      '<details class="nav-dropdown"><summary>Get Involved</summary><div class="dropdown-menu"><a href="' + base + 'participate.html">Ways to Participate</a><a href="' + base + 'remote-host-upload.html">Remote Host Upload</a><a href="' + base + 'remote-host.html">Become a Remote Host</a><a href="' + base + 'participate.html">Become a Guest</a></div></details>' +
      '<a href="https://crowrulesentertainment-oss.github.io/tacoma/" target="_blank" rel="noopener">Tacoma Community Hub ↗</a>' +\n      '<a href="' + base + 'donate.html">Support Tacoma Nights</a>' +
      '<details class="nav-dropdown"><summary>Members</summary><div class="dropdown-menu"><a href="' + base + 'members/login.html">Member Sign In</a><a href="' + base + 'members/dashboard.html">Member Dashboard</a></div></details>' +
      '<details class="nav-dropdown"><summary>Staff</summary><div class="dropdown-menu"><a data-control-room-link href="https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html" target="_blank" rel="noopener">Raven Control Room ↗</a></div></details>'
  }
  const menuButton = document.querySelector(".menu-toggle");
  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(!!open));
  });
  document.querySelectorAll(".nav-dropdown").forEach(dropdown => dropdown.addEventListener("toggle", () => {
    if (dropdown.open) document.querySelectorAll(".nav-dropdown").forEach(other => { if (other !== dropdown) other.open = false; });
  }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll(".nav-dropdown[open]").forEach(dropdown => dropdown.open = false); });
  document.addEventListener("click", event => { if (!event.target.closest(".nav-links")) document.querySelectorAll(".nav-dropdown[open]").forEach(dropdown => dropdown.open = false); });
  const CONTROL_ROOM_URL = "https://crowrulesentertainment-oss.github.io/crowrulesentertainment/tacoma-nights/control-room.html";
  document.querySelectorAll('a[href$="/admin/"],a[href$="admin/"],a[href*="/admin/command-center.html"]').forEach(link => {
    link.href = CONTROL_ROOM_URL;
    link.target = "_blank";
    link.rel = "noopener";
    if (/staff|admin|command center/i.test(link.textContent)) link.textContent = "Raven Control Room ↗";
    link.setAttribute("data-control-room-link", "");
  });
  document.querySelectorAll("[data-control-room-link]").forEach(link => {
    link.href = CONTROL_ROOM_URL;
    link.target = "_blank";
    link.rel = "noopener";
  });
  const connectionLabel = document.getElementById("connection-state");
  if (connectionLabel) connectionLabel.setAttribute("data-control-room-status", "");
  const footerLinks = document.querySelector(".footer .footer-row > div:nth-child(2), footer .footer-links");
  if (footerLinks && !footerLinks.querySelector("[data-control-room-link]")) {
    const separator = document.createTextNode(" · ");
    const link = document.createElement("a");
    link.href = CONTROL_ROOM_URL;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Raven Control Room";
    link.setAttribute("data-control-room-link", "");
    footerLinks.append(separator, link);
  }
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  const current = location.pathname.split("/").pop() || "index.html";
  nav?.querySelectorAll("a[href]").forEach(link => {
    try { const url = new URL(link.href, location.href); if (url.origin === location.origin && url.pathname.split("/").pop() === current) link.setAttribute("aria-current", "page"); } catch {}
  });

  // Weekly Friday 10 PM Pacific fallback, with published Supabase premiere settings taking precedence.
  const pacific = "America/Los_Angeles";
  const partsAt = (date, timeZone) => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
  }).formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  const pacificToUtc = (year, month, day, hour, minute) => {
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    let guess = target;
    for (let i = 0; i < 3; i++) {
      const p = partsAt(new Date(guess), pacific);
      const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      guess += target - represented;
    }
    return new Date(guess);
  };
  const nextWeeklyPremiere = () => {
    const now = new Date();
    const local = partsAt(now, pacific);
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone:pacific, weekday:"short" }).format(now);
    const dayIndex = ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[weekday];
    let add = (5 - dayIndex + 7) % 7;
    let candidate = pacificToUtc(local.year, local.month, local.day + add, 22, 0);
    if (candidate <= now) candidate = pacificToUtc(local.year, local.month, local.day + add + 7, 22, 0);
    return candidate;
  };
  const titleNode = document.getElementById("next-episode-title");
  const dateNode = document.getElementById("next-episode-date");
  const statusNode = document.getElementById("countdown-status");
  let fallbackEpisodeNumber = 6;
  let premiereAt = nextWeeklyPremiere();
  if (titleNode) titleNode.textContent = "EPISODE 006 — What Makes a Community Strong?";
  let countdownInterval;
  const formatPremiere = date => new Intl.DateTimeFormat("en-US", {
    timeZone:pacific, weekday:"long", month:"long", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short"
  }).format(date);
  const renderCountdown = () => {
    const left = Math.max(0, premiereAt.getTime() - Date.now());
    const days = Math.floor(left / 86400000);
    const hours = Math.floor((left % 86400000) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    [["count-days",days],["count-hours",hours],["count-minutes",minutes],["count-seconds",seconds]].forEach(([id,value]) => {
      const node = document.getElementById(id); if (node) node.textContent = String(value).padStart(2,"0");
    });
    if (left === 0) { if (statusNode) statusNode.textContent = "The next episode is here"; }
  };
  if (titleNode && dateNode) {
    dateNode.textContent = formatPremiere(premiereAt);
    renderCountdown();
    countdownInterval = window.setInterval(() => {
      if (Date.now() >= premiereAt.getTime()) {
        premiereAt = nextWeeklyPremiere();
        fallbackEpisodeNumber += 1;
        if (titleNode) titleNode.textContent = "EPISODE " + String(fallbackEpisodeNumber).padStart(3,"0") + " — Next Tacoma Nights Conversation";
        dateNode.textContent = formatPremiere(premiereAt);
        if (statusNode) statusNode.textContent = "Next episode countdown refreshed";
      }
      renderCountdown();
    }, 1000);
  }

  // Enforce show-specific video sources sitewide: never expose the general CrowRules channel feed.
  const tnPlaylist = "PLKfh6Jm08P-c";
  const tnPlaylistEmbed = "https://www.youtube-nocookie.com/embed/videoseries?list=" + tnPlaylist;
  const normalizeTacomaNightsMedia = root => {
    root.querySelectorAll("iframe[src]").forEach(frame => {
      try {
        const u = new URL(frame.getAttribute("src"), location.href);
        if (["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(u.hostname)) {
          if (frame.dataset.tnApprovedFeatured !== "true" && (u.searchParams.get("list") !== tnPlaylist || !u.pathname.includes("videoseries"))) {
            frame.src = tnPlaylistEmbed;
            frame.title = "Official Tacoma Nights episodes playlist";
          }
        }
      } catch {}
    });
    root.querySelectorAll('a[href*="youtube.com/@CrowRules_TV"],a[href*="youtube.com/channel/"]').forEach(link => {
      link.href = "https://www.youtube.com/playlist?list=" + tnPlaylist;
      link.textContent = link.textContent.replace(/CrowRules TV/gi,"Tacoma Nights Playlist");
    });
  };
  normalizeTacomaNightsMedia(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) { if (node.matches?.("iframe[src],a[href]")) normalizeTacomaNightsMedia(node.parentNode || document); else normalizeTacomaNightsMedia(node); }
  }))).observe(document.documentElement,{childList:true,subtree:true});

  // Shared browser-safe Supabase connection for Tacoma Nights public pages.
  const SUPABASE_URL = "https://cevylpnoexugwgygvtgu.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AdfM5y6RqvF3tbvEVzDZSg_JuGTQLD-";
  const state = document.getElementById("connection-state");
  const loadSupabase = () => new Promise((resolve, reject) => {
    if (window.supabase?.createClient) return resolve(window.supabase);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error("Supabase client unavailable"));
    script.onerror = () => reject(new Error("Supabase client failed to load"));
    document.head.appendChild(script);
  });
  loadSupabase().then(sdk => {
    const client = sdk.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true }
    });
    window.tacomaNightsSupabase = client;
    const controlRoomBridge = document.createElement("script");
    controlRoomBridge.src = base + "assets/js/control-room-bridge.js?v=7";
    controlRoomBridge.defer = true;
    document.head.appendChild(controlRoomBridge);
    if (state) state.textContent = "Connected to the Tacoma Nights community network";
    return client.from("tacoma_nights_show_settings")
      .select("show_title,premiere_at,status,is_published")
      .eq("setting_key","premiere").eq("is_published",true).maybeSingle()
      .then(({data,error}) => {
        if (error) throw error;
        if (data?.premiere_at) {
          const publishedPremiere = new Date(data.premiere_at);
          if (publishedPremiere > new Date()) {
            premiereAt = publishedPremiere;
            if (titleNode && data.show_title) titleNode.textContent = data.show_title;
            if (dateNode) dateNode.textContent = formatPremiere(premiereAt);
            if (statusNode) statusNode.textContent = "Premiere schedule synced from Tacoma Nights";
            renderCountdown();
          }
        }
      });
  }).catch(error => {
    console.warn("Tacoma Nights public connection:", error.message);
    if (state) state.textContent = "Episode countdown active · community connection will retry on refresh";
  });
});