(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const modes = ["lower-third", "next", "schedule", "full"];
  const urls = Object.create(null);

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function buildGraphics() {
    for (const mode of modes) {
      const url = new URL("../network/overlay.html", window.location.href);
      url.searchParams.set("mode", mode);
      urls[mode] = url.href;

      const label = mode === "lower-third" ? "url-lower" : `url-${mode}`;
      setText(label, url.href);
    }

    const selector = $("graphics-mode");
    const preview = $("graphics-preview");
    if (selector && preview && urls[selector.value]) {
      preview.src = urls[selector.value];
    }
  }

  async function refreshNetworkStatus() {
    const config = window.TACOMA_NIGHTS_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      setText("graphics-state", "CONFIGURATION MISSING");
      setText("graphics-detail", "The public Supabase browser configuration did not load. Check assets/js/config.js.");
      return;
    }

    const endpoint = config.supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/live_network_public_state" +
      "?select=public_status,current_program_title,next_program_title,updated_at" +
      "&is_published=eq.true&limit=1";

    try {
      const response = await fetch(endpoint, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: "Bearer " + config.supabaseAnonKey
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Public network state request failed (" + response.status + ").");
      }

      const rows = await response.json();
      const state = rows[0];

      setText("graphics-state", state ? "PUBLISHED STATE AVAILABLE" : "NO PUBLISHED STATE");
      setText(
        "graphics-detail",
        state
          ? "Now: " + (state.current_program_title || "Network standby") +
            " · Next: " + (state.next_program_title || "Not scheduled") +
            " · Updated " + (state.updated_at ? new Date(state.updated_at).toLocaleString() : "unknown")
          : "Publish a network state from Master Control to populate on-air graphics."
      );
    } catch (error) {
      setText("graphics-state", "UNAVAILABLE");
      setText("graphics-detail", error.message || "Could not load the published network state.");
    }
  }

  function bindCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const source = $(button.dataset.copy);
        if (!source) return;

        const value = source.textContent.trim();
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = value;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }

        const originalLabel = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1600);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildGraphics();
    refreshNetworkStatus();

    $("graphics-mode")?.addEventListener("change", buildGraphics);
    $("graphics-refresh")?.addEventListener("click", () => {
      const selector = $("graphics-mode");
      const preview = $("graphics-preview");
      if (selector && preview && urls[selector.value]) {
        const previewUrl = new URL(urls[selector.value]);
        previewUrl.searchParams.set("refresh", String(Date.now()));
        preview.src = previewUrl.href;
      }
      refreshNetworkStatus();
    });

    bindCopyButtons();
  });
})();
