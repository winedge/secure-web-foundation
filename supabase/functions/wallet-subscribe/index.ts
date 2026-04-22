import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("WALLET-SUBSCRIBE");

// Each subscription plan can be purchased via the wallet using either its USD or INR price ID.
// `price` is in the firm's wallet currency (USD = dollars, INR = rupees).
const PLAN_PRICES: Record<string, { price: number; product_id: string; plan: 'basic' | 'premium'; currency: 'usd' | 'inr' }> = {
  // USD
  price_1SzxaCKzSXP4o2z9sZU0jFy8: { price: 99, product_id: "prod_TxtMCJzuiHKivL", plan: 'basic', currency: 'usd' },
  price_1SzxaQKzSXP4o2z9zjRZWUNJ: { price: 249, product_id: "prod_TxtNjgqRTXPV67", plan: 'premium', currency: 'usd' },
  // INR
  price_1TP34mKzSXP4o2z9bdRacNk2: { price: 8500, product_id: "prod_UNoiAW62kBoQ4z", plan: 'basic', currency: 'inr' },
  price_1TP35MKzSXP4o2z9ojHvzRjQ: { price: 22000, product_id: "prod_UNoiKrGGJKHnOV", plan: 'premium', currency: 'inr' },
};

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    log("Function started");
    const user = await getAuthenticatedUser(req, supabase);
    const { priceId } = await req.json();

    if (!priceId || !PLAN_PRICES[priceId]) {
      throw new Error("Invalid price ID");
    }

    const planInfo = PLAN_PRICES[priceId];
    log("Plan selected", { priceId, price: planInfo.price });

    // Get user's firm
    const { data: firmMember, error: fmErr } = await supabase
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (fmErr) throw fmErr;
    if (!firmMember) throw new Error("No firm found for user");

    // Get firm's wallet balance
    const { data: firm, error: firmErr } = await supabase
      .from("firms")
      .select("wallet_balance, subscription_plan, subscription_status, stripe_customer_id")
      .eq("id", firmMember.firm_id)
      .single();
    if (firmErr) throw firmErr;

    const walletBalance = Number(firm.wallet_balance || 0);
    if (walletBalance < planInfo.price) {
      throw new Error(`Insufficient wallet balance. You need $${planInfo.price} but have $${walletBalance.toFixed(2)}`);
    }

    // Deduct from wallet
    const { error: deductErr } = await supabase
      .from("firms")
      .update({
        wallet_balance: walletBalance - planInfo.price,
        subscription_plan: priceId === "price_1SzxaCKzSXP4o2z9sZU0jFy8" ? "basic" : "premium",
        subscription_status: "active",
      })
      .eq("id", firmMember.firm_id);
    if (deductErr) throw deductErr;

    // Log the transaction in audit_logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "wallet_subscription_purchase",
      entity_type: "subscription",
      entity_id: firmMember.firm_id,
      details: {
        price_id: priceId,
        amount: planInfo.price,
        product_id: planInfo.product_id,
        previous_balance: walletBalance,
        new_balance: walletBalance - planInfo.price,
      },
    });

    log("Subscription purchased via wallet", {
      firmId: firmMember.firm_id,
      amount: planInfo.price,
      newBalance: walletBalance - planInfo.price,
    });

    return jsonResponse({
      success: true,
      message: `Successfully subscribed! $${planInfo.price} deducted from wallet.`,
      new_balance: walletBalance - planInfo.price,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
