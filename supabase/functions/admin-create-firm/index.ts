import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { firm_name, website, states, practice_type, contact_email, contact_phone, owner_email, owner_password, owner_full_name, subscription_plan, wallet_balance } = await req.json();

    if (!firm_name || !owner_email || !owner_password) {
      return jsonResponse({ error: "firm_name, owner_email, and owner_password are required" }, 400);
    }

    // Use service role to create user and firm
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !caller) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    
    if (!roleCheck) return jsonResponse({ error: "Admin access required" }, 403);

    // 1. Create user account (auto-confirmed)
    const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
      user_metadata: { full_name: owner_full_name || owner_email },
    });

    if (userErr) return jsonResponse({ error: `Failed to create user: ${userErr.message}` }, 400);

    // 2. Create firm
    const { data: firm, error: firmErr } = await supabaseAdmin
      .from("firms")
      .insert({
        name: firm_name,
        website: website || null,
        states: states || [],
        practice_type: practice_type || null,
        contact_email: contact_email || owner_email,
        contact_phone: contact_phone || null,
        subscription_plan: subscription_plan || "basic",
        subscription_status: "active",
        wallet_balance: wallet_balance || 0,
      })
      .select()
      .single();

    if (firmErr) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return jsonResponse({ error: `Failed to create firm: ${firmErr.message}` }, 400);
    }

    // 3. Add user as firm owner
    const { error: memberErr } = await supabaseAdmin
      .from("firm_members")
      .insert({ firm_id: firm.id, user_id: newUser.user.id, is_owner: true });

    if (memberErr) {
      console.error("Failed to add firm member:", memberErr);
    }

    // 4. Add firm_owner role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "firm_owner" });

    return jsonResponse({
      success: true,
      firm_id: firm.id,
      user_id: newUser.user.id,
      message: `Firm "${firm_name}" created with owner ${owner_email}`,
    });
  } catch (e) {
    console.error("admin-create-firm error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
