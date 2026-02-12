import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("CREATE-CHECKOUT");

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabaseClient = createSupabaseClient();

  try {
    log("Function started");

    const body = await req.json();
    const { amount, priceId } = body;

    const isSubscription = !!priceId;

    if (!isSubscription && (!amount || amount < 1)) {
      throw new Error("Invalid amount");
    }
    log("Request received", { amount, priceId, isSubscription });

    const user = await getAuthenticatedUser(req, supabaseClient);
    log("User authenticated", { userId: user.id, email: user.email });

    const stripe = getStripe();

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      log("Existing customer found", { customerId });
    }

    let session;

    if (isSubscription) {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/wallet?success=true&subscription=true`,
        cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
        metadata: { user_id: user.id, type: "subscription" },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Wallet Top-Up",
                description: `Add $${amount} to your LeadsThru wallet`,
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/wallet?success=true&amount=${amount}`,
        cancel_url: `${req.headers.get("origin")}/wallet?canceled=true`,
        metadata: { user_id: user.id, amount: amount.toString(), type: "wallet_topup" },
      });
    }

    log("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
