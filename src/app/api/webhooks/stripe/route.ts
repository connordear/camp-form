import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { db } from "@/lib/data/db";
import { registrations } from "@/lib/data/schema";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // 1. Retrieve the full session with Line Items expanded
    // We need 'line_items.data.price.product' to get the metadata we saved
    const expandedSession = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items.data.price.product"],
      },
    );

    const lineItems = expandedSession.line_items?.data || [];

    // 2. Loop through each item and update its specific Registration ID
    await db.transaction(async (tx) => {
      for (const item of lineItems) {
        // Retrieve the metadata from the 'Product' object Stripe created
        // Note: Stripe types can be tricky here, 'product' is string | Stripe.Product
        const product = item.price?.product as any;
        const registrationId = product?.metadata?.registrationId;
        if (typeof registrationId !== "string") {
          console.error(`Invalid registrationId sent: ${registrationId}`);
          continue;
        }

        if (!registrationId) {
          console.error(`No registration ID found for item ${item.id}`);
          continue;
        }

        // 3. Update the DB
        // item.amount_total is the FINAL price (Base - Coupon Discount)
        // Stripe has already done the math for us!
        await tx
          .update(registrations)
          .set({
            status: "registered",
            pricePaid: item.amount_total, // e.g. 9000 ($90.00) if 10% off
            stripePaymentIntentId: session.payment_intent as string,
            stripeSessionId: session.id,
            updatedAt: new Date(),
          })
          .where(eq(registrations.id, registrationId));
      }
    });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      console.error("No payment intent ID on charge.refunded event");
      return new Response(null, { status: 200 });
    }

    const isFullyRefunded = charge.amount_refunded >= charge.amount;
    if (!isFullyRefunded) {
      return new Response(null, { status: 200 });
    }

    const activeRegistrations = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.stripePaymentIntentId, paymentIntentId),
          eq(registrations.status, "registered"),
        ),
      );

    if (activeRegistrations.length === 0) {
      return new Response(null, { status: 200 });
    }

    await db.transaction(async (tx) => {
      const chargeRefunds = charge.refunds;
      const firstRefund = chargeRefunds?.data?.[0];

      for (const reg of activeRegistrations) {
        if (reg.stripeRefundId) continue;

        await tx
          .update(registrations)
          .set({
            status: "refunded",
            refundedAt: new Date(),
            refundAmount: firstRefund?.amount ?? null,
            refundReason: firstRefund?.reason ?? null,
            stripeRefundId: firstRefund?.id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(registrations.id, reg.id));
      }
    });

    revalidatePath("/admin");
  }

  revalidatePath("/registration");

  return new Response(null, { status: 200 });
}
