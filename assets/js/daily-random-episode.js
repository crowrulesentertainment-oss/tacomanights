/* Daily random Tacoma Nights episode for the homepage.
   Uses the official public playlist feed and a Pacific-date seed so every visitor
   sees the same selected episode for the entire day. */
(() => {
  "use strict";
  const PLAYLIST_ID = "PLKfh6Jm08P-c";
  const FEED_URL = "https://www.youtube.com/feeds/videos.xml?playlist_id=" + PLAYLIST_ID;
  const player = document.getElementById("tn-daily-random-player");
  const titleNode = document.getElementById("tn-daily-random-title");
  const linkNode = document.getElementById("tn-daily-random-link");
  if (!player) return;
  const pacificDateKey = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const dayHash = value => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  async function loadDailyEpisode() {
    try {
      const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(FEED_URL);
      const response = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("Playlist feed request failed");
      const payload = await response.json();
      if (payload.status !== "ok" || !Array.isArray(payload.items)) throw new Error("Playlist feed unavailable");
      const episodes = payload.items.map(item => {
        const match = String(item.guid || item.link || "").match(/(?:v=|youtu\.be\/|yt:video:)([A-Za-z0-9_-]{11})/);
        const id = match?.[1] || String(item.guid || "").replace(/^yt:video:/, "");
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? { id, title: item.title || "Tacoma Nights episode" } : null;
      }).filter(Boolean);
      if (!episodes.length) throw new Error("No past episodes found");
      const key = pacificDateKey() + "|" + PLAYLIST_ID;
      const episode = episodes[dayHash(key) % episodes.length];
      player.dataset.tnApprovedFeatured = "true";
      player.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(episode.id) + "?rel=0&modestbranding=1";
      player.title = episode.title + " — Daily Random Tacoma Nights Episode";
      if (titleNode) titleNode.textContent = episode.title;
      if (linkNode) linkNode.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(episode.id);
    } catch (error) {
      console.warn("Tacoma Nights daily episode:", error);
      if (titleNode) titleNode.textContent = "Browse the Tacoma Nights episode archive";
      if (linkNode) {
        linkNode.href = "https://www.youtube.com/playlist?list=" + PLAYLIST_ID;
        linkNode.textContent = "Open Tacoma Nights Playlist ↗";
      }
    }
  }
  loadDailyEpisode();
})();
