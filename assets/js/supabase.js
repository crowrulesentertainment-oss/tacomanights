(() => {
 const c=window.TACOMA_NIGHTS_CONFIG;
 if(window.supabase&&c) window.tnSupabase=window.supabase.createClient(c.supabaseUrl,c.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
})();