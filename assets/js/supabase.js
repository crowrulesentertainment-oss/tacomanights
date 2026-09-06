/* =========================================================
   CROWRULES CREATORS HUB
   SUPABASE CLIENT
   ========================================================= */

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } =
  window.CROWRULES_CONFIG;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase configuration is missing.");
}

window.crSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );

window.crDB = window.crSupabase;