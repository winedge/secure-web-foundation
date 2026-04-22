import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { getStripe } from "../_shared/stripe.ts";

const log = createLogger("CREATE-CHECKOUT");

/**
 * Resolve the firm's billing country and derive the currency to charge in.
 * Falls back to USD if no firm or no country is on file.
 */
async function resolveCurrency(supabase: ReturnType<typeof createSupabaseClient>, userId: string): Promise<{ currency: 'usd' | 'inr'; country: string }> {
  try {
    const { data: member } = await supabase
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!member?.firm_id) return { currency: 'usd', country: 'US' };
    const { data: firm } = await supabase
      .from('firms')
      .select('country')
      .eq('id', member.firm_id)
      .maybeSingle();
    const country = (firm?.country || 'US').toUpperCase();
    return { currency: country === 'IN' ? 'inr' : 'usd', country };
  } catch (e) {
    log('Currency resolution failed, defaulting to USD', { error: String(e) });
    return { currency: 'usd', country: 'US' };
  }
}

/**
 * Fetch a live USD->INR rate (for wallet top-ups). The amount the user enters
 * is treated as a USD amount; we convert it to INR before charging Stripe.
 * Falls back to 88 if the FX request fails so checkout never breaks.
 */
async function getUsdInrRate(): Promise<number> {
  try {
    const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR');
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json() as { rates?: { INR?: number } };
    const rate = data?.rates?.INR;
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) return rate;
    throw new Error('invalid rate');
  } catch (e) {
    log('FX fetch failed, using fallback', { error: String(e) });
    return 88;
  }
}

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

    const { currency, country } = await resolveCurrency(supabaseClient, user.id);
    log("Resolved billing currency", { currency, country });

    const stripe = getStripe();

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      log("Existing customer found", { customerId });
    }

    let session;

    if (isSubscription) {
      // For subscriptions the priceId is currency-specific (selected on the
      // frontend via priceIdForTier()). We pass it through unchanged.
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/wallet?success=true&subscription=true`,
        cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
        metadata: { user_id: user.id, type: "subscription", country, currency },
      });
    } else {
      // Wallet top-up. The `amount` is in USD (the canonical pricing unit).
      // For India we convert USD -> INR using a live FX rate.
      const isInr = currency === 'inr';
      const fxRate = isInr ? await getUsdInrRate() : 1;
      const chargeAmount = isInr ? Math.round(amount * fxRate) : amount;
      const display = isInr ? `₹${chargeAmount}` : `$${amount}`;
      log("Wallet top-up amount", { amount_usd: amount, currency, fxRate, chargeAmount });

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: "Wallet Top-Up",
                description: `Add ${display} to your LeadsThru wallet`,
              },
              unit_amount: chargeAmount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/wallet?success=true&amount=${amount}`,
        cancel_url: `${req.headers.get("origin")}/wallet?canceled=true`,
        metadata: {
          user_id: user.id,
          amount: amount.toString(),
          amount_usd: amount.toString(),
          charged_amount: chargeAmount.toString(),
          currency,
          country,
          fx_rate: fxRate.toString(),
          type: "wallet_topup",
        },
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
