import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("STRIPE-WEBHOOK");

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const stripe = getStripe();
  const supabase = createSupabaseClient(true);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      log("ERROR", { message: "STRIPE_WEBHOOK_SECRET is not configured" });
      return jsonResponse({ error: "Webhook secret not configured" }, 500);
    }

    if (!signature) {
      log("ERROR", { message: "Missing stripe-signature header" });
      return jsonResponse({ error: "Missing signature" }, 400);
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    log("Event received", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log("Checkout session completed", { sessionId: session.id, metadata: session.metadata });

        if (session.metadata?.type === "wallet_topup") {
          const userId = session.metadata.user_id;
          const amount = parseFloat(session.metadata.amount);

          if (!userId || !amount) {
            log("Missing metadata", { userId, amount });
            break;
          }

          const { data: firmMember, error: firmError } = await supabase
            .from("firm_members")
            .select("firm_id")
            .eq("user_id", userId)
            .single();

          if (firmError || !firmMember) {
            log("Firm not found for user", { userId, error: firmError });
            break;
          }

          const { data: firm, error: getFirmError } = await supabase
            .from("firms")
            .select("wallet_balance")
            .eq("id", firmMember.firm_id)
            .single();

          if (getFirmError || !firm) {
            log("Error getting firm balance", { error: getFirmError });
            break;
          }

          const newBalance = Number(firm.wallet_balance || 0) + amount;

          const { error: updateError } = await supabase
            .from("firms")
            .update({ wallet_balance: newBalance })
            .eq("id", firmMember.firm_id);

          if (updateError) {
            log("Error updating wallet", { error: updateError });
            throw updateError;
          }

          log("Wallet updated successfully", {
            firmId: firmMember.firm_id,
            previousBalance: firm.wallet_balance,
            addedAmount: amount,
            newBalance,
          });

          await supabase.from("audit_logs").insert({
            user_id: userId,
            action: "wallet_topup",
            entity_type: "firm",
            entity_id: firmMember.firm_id,
            details: {
              amount,
              stripe_session_id: session.id,
              payment_intent: session.payment_intent,
            },
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log("Payment intent succeeded", { id: paymentIntent.id });
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 400);
  }
});
