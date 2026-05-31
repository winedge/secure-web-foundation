import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("CHECK-SUBSCRIPTION");

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    log("Function started");

    const stripe = getStripe();
    const user = await getAuthenticatedUser(req);
    log("User authenticated", { userId: user.id, email: user.email });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });

    if (customers.data.length === 0) {
      log("No Stripe customer found");
      return jsonResponse({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    log("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      log("Active subscription found", { subscriptionId: subscription.id, productId, endDate: subscriptionEnd });
    } else {
      log("No active subscription found");
    }

    return jsonResponse({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    const status = errorMessage.startsWith("Unauthorized") || errorMessage.includes("not authenticated") ? 401 : 500;
    return jsonResponse({ error: errorMessage }, status);
  }
});
