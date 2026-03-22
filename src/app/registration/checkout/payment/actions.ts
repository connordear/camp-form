"use server";
import type Stripe from "stripe";
import { siteConfig } from "@/config/site";
import { requireAuth } from "@/lib/auth-helpers";
import { getDiscountsByIds } from "@/lib/services/discount-service";
import { getRegistrationsByIds } from "@/lib/services/registration-service";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/utils";

// Define your color palettes here
const THEMES = {
  dark: {
    border: "rounded",
  },
};

export async function fetchClientSecret(
  registrationIds?: string[],
  appliedDiscountIds: string[] = [],
) {
  const session = await requireAuth();
  const userId = session.user.id;

  if (!registrationIds?.length) {
    throw new Error("Please specify the registrations you wish to pay for");
  }

  const user = await getRegistrationsByIds(userId, registrationIds);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (!user) {
    throw new Error("No user.");
  }

  user.campers.forEach((camper: (typeof user.campers)[number]) => {
    camper.registrations.forEach(
      (reg: (typeof camper.registrations)[number]) => {
        lineItems.push({
          price_data: {
            currency: "cad",
            unit_amount: reg.price.price,
            product_data: {
              name: `${camper.firstName} ${camper.lastName} - ${reg.campYear?.camp.name} - ${reg.price.name}`,
              metadata: {
                userId: user.id,
                registrationId: reg.id,
                camperName: `${camper.firstName} ${camper.lastName}`,
                camp: `${reg.campYear.year} ${reg.campYear.camp.name}`,
              },
            },
          },
          quantity: reg.numDays && reg.price.isDayPrice ? reg.numDays : 1,
          tax_rates: [process.env.TAX_RATE!],
        });
      },
    );
  });

  if (!lineItems.length) {
    return null;
  }

  const discounts = await getDiscountsByIds(appliedDiscountIds);
  const stripeDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] =
    discounts
      .filter((d) => d.stripeCouponId)
      .map((d) => ({
        coupon: d.stripeCouponId!,
      }));

  const stripeSession = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: lineItems,
    mode: "payment",
    return_url: `${getBaseUrl()}/registration/checkout/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    billing_address_collection: "required",
    ...(stripeDiscounts.length > 0 && { discounts: stripeDiscounts }),
    ...(!discounts?.length && { allow_promotion_codes: true }),
    branding_settings: {
      display_name: siteConfig.name,
      font_family: "roboto",
      border_style: "rounded",
    },
  });

  return stripeSession.client_secret ?? "";
}
