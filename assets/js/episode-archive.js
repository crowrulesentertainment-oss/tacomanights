/* Tacoma Nights public episode archive. Reads the public YouTube playlist feed only. */
(() => {
  "use strict";
  const PLAYLIST_ID = "PLYK7RQq4_mhw";
  const PLAYLIST_URL = "https://www.youtube.com/playlist?list=" + PLAYLIST_ID;
  const FEED_URL = "https://www.youtube.com/feeds/videos.xml?playlist_id=" + PLAYLIST_ID;
  const grid = document.getElementById("tn-episode-grid");
  const search = document.getElementById("tn-episode-search");
  const count = document.getElementById("tn-episode-count");
  const fallback = document.getElementById("tn-archive-fallback");
  const player = document.querySelector("[data-tn-featured-player]");
  if (!grid) return;
  let episodes = [];
  const safeDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(date);
  };
  const escapeHTML = value => String(value || "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function play(episode) {
    if (!player || !/^[A-Za-z0-9_-]{11}$/.test(episode.id)) return;
    player.dataset.tnApprovedFeatured = "true";
    player.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(episode.id) + "?autoplay=1&rel=0&modestbranding=1";
    player.title = episode.title + " — Tacoma Nights";
    const title = document.querySelector("[data-tn-featured-title]");
    const description = document.querySelector("[data-tn-featured-description]");
    const link = document.querySelector("[data-tn-featured-link]");
    const label = document.getElementById("tn-playing-label");
    if (title) title.textContent = episode.title;
    if (description) description.textContent = "Now selected from the official Tacoma Nights episode archive.";
    if (link) { link.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(episode.id); link.textContent = "Open This Episode on YouTube ↗"; }
    if (label) label.textContent = "NOW PLAYING · TACOMA NIGHTS";
    player.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function render() {
    const term = (search?.value || "").trim().toLowerCase();
    const visible = episodes.filter(item => item.title.toLowerCase().includes(term));
    count.textContent = term ? visible.length + " matching episode" + (visible.length===1?"":"s") : episodes.length + " episodes loaded from the official playlist";
    if (!visible.length) {
      grid.innerHTML = '<div class="archive-empty">No Tacoma Nights episodes match that search. Try another title.</div>';
      return;
    }
    grid.innerHTML = visible.map(item => {
      const id = escapeHTML(item.id);
      const title = escapeHTML(item.title);
      const thumb = escapeHTML(item.thumbnail);
      const date = escapeHTML(safeDate(item.published));
      return '<article class="episode-card card"><button class="episode-thumb" type="button" data-episode-id="'+id+'" aria-label="Play '+title+'"><img src="'+thumb+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="episode-play" aria-hidden="true">▶</span></button><div class="episode-info"><div class="episode-date">'+(date||"Tacoma Nights episode")+'</div><h3 class="episode-title">'+title+'</h3><a class="episode-watch" href="https://www.youtube.com/watch?v='+id+'" target="_blank" rel="noopener">Play episode ↗</a></div></article>';
    }).join("");
    grid.querySelectorAll("[data-episode-id]").forEach(button => button.addEventListener("click", () => {
      const selected = episodes.find(item => item.id === button.dataset.episodeId);
      if (selected) play(selected);
    }));
  }
  async function load() {
    try {
      const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(FEED_URL);
      const response = await fetch(url,{headers:{"Accept":"application/json"}});
      if (!response.ok) throw new Error("Playlist feed request failed");
      const payload = await response.json();
      if (payload.status !== "ok" || !Array.isArray(payload.items)) throw new Error("Playlist feed unavailable");
      episodes = payload.items.map(item => {
        const match = String(item.guid || item.link || "").match(/(?:v=|youtu\.be\/|yt:video:)([A-Za-z0-9_-]{11})/);
        const id = match?.[1] || String(item.guid || "").replace(/^yt:video:/,"");
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
        return {id,title:item.title || "Tacoma Nights episode",thumbnail:item.thumbnail || "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",published:item.pubDate || ""};
      }).filter(Boolean);
      if (!episodes.length) throw new Error("No playlist episodes returned");
      render();
    } catch (error) {
      console.warn("Tacoma Nights episode archive:",error);
      grid.innerHTML = "";
      count.textContent = "Full archive available in the playlist player";
      fallback.hidden = false;
    }
  }
  search?.addEventListener("input",render);
  load();
})();
