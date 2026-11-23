(() => {
  "use strict";

  const config = window.TACOMA_NIGHTS_CONFIG || {};
  const bridgeUrl = "http://127.0.0.1:8787";
  let client = null;
  let session = null;
  let pairToken = sessionStorage.getItem("tn_bridge_token") || "";
  let lastPairedAccessToken = "";
  let pairInFlight = null;
  let pairInFlightToken = "";

  const $ = (id) => document.getElementById(id);

  const ready = (async () => {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase JavaScript library did not load. Check the Supabase CDN script in this page.");
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Supabase browser configuration is missing. Check assets/js/config.js and its script load order.");
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const result = await client.auth.getSession();
    session = result.data.session;
    render();

    client.auth.onAuthStateChange((_event, newSession) => {
      session = newSession;
      render();

      if (!newSession?.access_token) {
        lastPairedAccessToken = "";
        return;
      }
      if (pairToken && newSession.access_token !== lastPairedAccessToken) {
        pair(newSession.access_token).catch((error) => {
          console.warn("Bridge session refresh failed", error);
        });
      }
    });

    return {
      client,
      getSession: () => session,
      pairBridge: setPairToken,
      bridgeUrl
    };
  })();

  function render() {
    const state = $("auth-state");
    const form = $("studio-login");
    const signOut = $("studio-signout");

    if (state) {
      state.textContent = session
        ? "Signed in: " + (session.user.email || "CrowRules account")
        : "Sign in with your existing CrowRules Supabase account";
    }
    if (form) form.hidden = Boolean(session);
    if (signOut) signOut.hidden = !session;

    document.querySelectorAll("[data-requires-auth]").forEach((element) => {
      element.hidden = !session;
    });
  }

  async function setPairToken(token) {
    const nextToken = token || "";
    if (nextToken !== pairToken) {
      pairToken = nextToken;
      lastPairedAccessToken = "";
    }

    if (pairToken) {
      sessionStorage.setItem("tn_bridge_token", pairToken);
    } else {
      sessionStorage.removeItem("tn_bridge_token");
    }

    if (session?.access_token && pairToken) {
      return pair(session.access_token);
    }
    return null;
  }

  async function pair(accessToken) {
    if (!pairToken) {
      throw new Error("Local bridge token is missing. Connect the bridge again.");
    }
    if (lastPairedAccessToken === accessToken) {
      return { paired: true, alreadyPaired: true };
    }
    if (pairInFlight && pairInFlightToken === accessToken) {
      return pairInFlight;
    }

    pairInFlightToken = accessToken;
    pairInFlight = (async () => {
      const response = await fetch(bridgeUrl + "/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + pairToken
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: session?.refresh_token,
          expires_at: session?.expires_at
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Could not pair local bridge (" + response.status + ").");
      }

      lastPairedAccessToken = accessToken;
      return data;
    })();

    try {
      return await pairInFlight;
    } finally {
      pairInFlight = null;
      pairInFlightToken = "";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("studio-login")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = $("auth-message");
      if (message) message.textContent = "Signing in…";

      try {
        await ready;
        const result = await client.auth.signInWithPassword({
          email: $("studio-email").value.trim(),
          password: $("studio-password").value
        });
        if (result.error) throw result.error;
        if (message) message.textContent = "Signed in.";
      } catch (error) {
        if (message) message.textContent = error.message;
      }
    });

    $("studio-signout")?.addEventListener("click", async () => {
      try {
        await ready;
        const result = await client.auth.signOut({ scope: "local" });
        if (result.error) throw result.error;
        session = null;
        lastPairedAccessToken = "";
        render();
      } catch (error) {
        const message = $("auth-message");
        if (message) message.textContent = error.message;
      }
    });

    ready.catch((error) => {
      console.error("Tacoma Nights Studio authentication initialization failed:", error);
      const state = $("auth-state");
      const message = $("auth-message");
      if (state) state.textContent = "AUTHENTICATION UNAVAILABLE";
      if (message) message.textContent = error.message;
    });
  });

  window.TNStudioReady = ready;
  window.TNStudioAuth = {
    get client() { return client; },
    get session() { return session; },
    setPairToken,
    bridgeUrl
  };
})();
