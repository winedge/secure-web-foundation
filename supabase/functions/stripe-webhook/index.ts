import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // For now, we'll process without signature verification
    // In production, add STRIPE_WEBHOOK_SECRET to secrets and verify
    const event = JSON.parse(body) as Stripe.Event;
    logStep("Event received", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id,
          metadata: session.metadata 
        });

        if (session.metadata?.type === "wallet_topup") {
          const userId = session.metadata.user_id;
          const amount = parseFloat(session.metadata.amount);

          if (!userId || !amount) {
            logStep("Missing metadata", { userId, amount });
            break;
          }

          // Get user's firm
          const { data: firmMember, error: firmError } = await supabase
            .from("firm_members")
            .select("firm_id")
            .eq("user_id", userId)
            .single();

          if (firmError || !firmMember) {
            logStep("Firm not found for user", { userId, error: firmError });
            break;
          }

          // Get current wallet balance
          const { data: firm, error: getFirmError } = await supabase
            .from("firms")
            .select("wallet_balance")
            .eq("id", firmMember.firm_id)
            .single();

          if (getFirmError || !firm) {
            logStep("Error getting firm balance", { error: getFirmError });
            break;
          }

          const newBalance = Number(firm.wallet_balance || 0) + amount;

          // Update wallet balance
          const { error: updateError } = await supabase
            .from("firms")
            .update({ wallet_balance: newBalance })
            .eq("id", firmMember.firm_id);

          if (updateError) {
            logStep("Error updating wallet", { error: updateError });
            throw updateError;
          }

          logStep("Wallet updated successfully", {
            firmId: firmMember.firm_id,
            previousBalance: firm.wallet_balance,
            addedAmount: amount,
            newBalance,
          });

          // Log the transaction
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
        logStep("Payment intent succeeded", { id: paymentIntent.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
