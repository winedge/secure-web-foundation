import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("CUSTOMER-PORTAL");

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    log("Function started");

    const supabaseClient = createSupabaseClient(true);
    const user = await getAuthenticatedUser(req, supabaseClient);
    log("User authenticated", { userId: user.id, email: user.email });

    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    log("Found Stripe customer", { customerId });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/wallet`,
    });
    log("Portal session created", { url: portalSession.url });

    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
