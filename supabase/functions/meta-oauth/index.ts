import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, code, redirect_uri, user_id, firm_id } = await req.json();

    // Get Meta API credentials from admin_settings
    const { data: metaSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["meta_app_id", "meta_app_secret"]);

    const settingsMap: Record<string, any> = {};
    metaSettings?.forEach((s: any) => (settingsMap[s.key] = s.value));

    const META_APP_ID = settingsMap.meta_app_id?.app_id;
    const META_APP_SECRET = settingsMap.meta_app_secret?.app_secret;

    if (action === "get_login_url") {
      if (!META_APP_ID)
        return new Response(
          JSON.stringify({ error: "Meta App ID not configured by admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const scopes = [
        "pages_manage_ads",
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_read_user_content",
        "ads_management",
        "ads_read",
        "business_management",
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights",
        "public_profile",
      ].join(",");

      const loginUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scopes}&response_type=code&state=${user_id}`;

      return new Response(JSON.stringify({ login_url: loginUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_token") {
      if (!META_APP_ID || !META_APP_SECRET)
        return new Response(
          JSON.stringify({ error: "Meta API credentials not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      // Exchange code for short-lived token
      const tokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`
      );
      const tokenData = await tokenResp.json();

      if (tokenData.error)
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      // Exchange for long-lived token
      const longTokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longTokenData = await longTokenResp.json();

      // Get user info
      const userResp = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${longTokenData.access_token}`
      );
      const userData = await userResp.json();

      // Get user pages
      const pagesResp = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token=${longTokenData.access_token}`
      );
      const pagesData = await pagesResp.json();

      // Get permissions
      const permsResp = await fetch(
        `https://graph.facebook.com/v21.0/me/permissions?access_token=${longTokenData.access_token}`
      );
      const permsData = await permsResp.json();
      const grantedPerms = permsData.data
        ?.filter((p: any) => p.status === "granted")
        .map((p: any) => p.permission) || [];

      // Save connection
      const { data: connection, error: connError } = await supabase
        .from("platform_connections")
        .upsert(
          {
            user_id,
            firm_id,
            platform: "facebook",
            platform_user_id: userData.id,
            platform_username: userData.name,
            access_token: longTokenData.access_token,
            token_expires_at: new Date(
              Date.now() + (longTokenData.expires_in || 5184000) * 1000
            ).toISOString(),
            permissions: grantedPerms,
            is_active: true,
            metadata: { pages: pagesData.data || [] },
          },
          { onConflict: "user_id,platform" }
        )
        .select()
        .single();

      // Save page connections for each page
      if (pagesData.data) {
        for (const page of pagesData.data) {
          await supabase.from("platform_connections").upsert(
            {
              user_id,
              firm_id,
              platform: "facebook_page",
              platform_user_id: page.id,
              platform_username: page.name,
              page_id: page.id,
              page_name: page.name,
              page_access_token: page.access_token,
              access_token: longTokenData.access_token,
              is_active: true,
              metadata: { category: page.category },
            },
            { onConflict: "user_id,platform" }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: userData,
          pages: pagesData.data || [],
          permissions: grantedPerms,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_connection") {
      const { data: conn } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", "facebook")
        .eq("is_active", true)
        .single();

      if (!conn)
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      // Verify token is still valid
      const verifyResp = await fetch(
        `https://graph.facebook.com/v21.0/me?access_token=${conn.access_token}`
      );
      const verifyData = await verifyResp.json();

      const isValid = !verifyData.error;

      if (!isValid) {
        await supabase
          .from("platform_connections")
          .update({ is_active: false })
          .eq("id", conn.id);
      }

      return new Response(
        JSON.stringify({
          connected: isValid,
          user: isValid ? verifyData : null,
          token_expires_at: conn.token_expires_at,
          permissions: conn.permissions,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_admin_credentials") {
      if (!META_APP_ID || !META_APP_SECRET) {
        return new Response(
          JSON.stringify({ valid: false, error: "Credentials not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify with app token
      const appTokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&grant_type=client_credentials`
      );
      const appTokenData = await appTokenResp.json();

      return new Response(
        JSON.stringify({
          valid: !appTokenData.error,
          error: appTokenData.error?.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-oauth error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
