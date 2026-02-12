import Stripe from "https://esm.sh/stripe@18.5.0";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  
  _stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
  return _stripe;
}

export async function getOrCreateCustomer(stripe: Stripe, email: string): Promise<{ customerId: string; isNew: boolean }> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  
  if (customers.data.length > 0) {
    return { customerId: customers.data[0].id, isNew: false };
  }
  
  const customer = await stripe.customers.create({ email });
  return { customerId: customer.id, isNew: true };
}
