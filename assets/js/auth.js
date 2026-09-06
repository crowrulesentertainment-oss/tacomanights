/* =========================================================
   CROWRULES CREATORS HUB
   AUTHENTICATION
   ========================================================= */

window.CRAuth = {

  async user() {
    const { data, error } =
      await crSupabase.auth.getUser();

    if (error) {
      console.warn("Auth user error:", error.message);
      return null;
    }

    return data?.user || null;
  },

  async session() {
    const { data, error } =
      await crSupabase.auth.getSession();

    if (error) {
      console.warn("Session error:", error.message);
      return null;
    }

    return data?.session || null;
  },

  async signIn(email, password) {

    const { data, error } =
      await crSupabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    return data;
  },

  async signUp(email, password, metadata = {}) {

    const { data, error } =
      await crSupabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

    if (error) throw error;

    return data;
  },

  async signOut() {

    const { error } =
      await crSupabase.auth.signOut();

    if (error) throw error;

    window.location.href = "index.html";
  },

  async requireUser() {

    const user = await this.user();

    if (!user) {
      const next =
        encodeURIComponent(
          window.location.pathname +
          window.location.search
        );

      window.location.href =
        `login.html?next=${next}`;

      return null;
    }

    return user;
  },

  async creatorProfile(userId) {

    const { data, error } =
      await crDB
        .from("creator_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;

    return data;
  },

  async ensureCreatorProfile() {

    const user = await this.user();

    if (!user) return null;

    let profile =
      await this.creatorProfile(user.id);

    if (profile) return profile;

    const metadata =
      user.user_metadata || {};

    const displayName =
      metadata.display_name ||
      metadata.name ||
      user.email?.split("@")[0] ||
      "New Creator";

    const handle =
      metadata.handle ||
      (
        displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40)
      ) ||
      `creator-${user.id.slice(0, 8)}`;

    const { data, error } =
      await crDB
        .from("creator_profiles")
        .insert({
          id: user.id,
          handle,
          display_name: displayName,
          bio: "",
          creator_type: "creator",
          status: "pending"
        })
        .select()
        .single();

    if (error) {

      if (
        error.code === "23505"
      ) {
        return await this.creatorProfile(user.id);
      }

      throw error;
    }

    profile = data;

    return profile;
  }
};


/* =========================================================
   AUTH NAVIGATION
   ========================================================= */

async function updateAuthNavigation() {

  const user =
    await CRAuth.user();

  document
    .querySelectorAll("[data-auth-user]")
    .forEach(el => {

      el.textContent =
        user?.email || "Guest";
    });

  document
    .querySelectorAll("[data-auth-only]")
    .forEach(el => {

      el.hidden = !user;
    });

  document
    .querySelectorAll("[data-guest-only]")
    .forEach(el => {

      el.hidden = !!user;
    });
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await updateAuthNavigation();

    crSupabase.auth.onAuthStateChange(
      async () => {

        await updateAuthNavigation();
      }
    );
  }
);