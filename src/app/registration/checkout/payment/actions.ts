"use server";
import { auth } from "@clerk/nextjs/server";
import type Stripe from "stripe";
import { getRegistrationsByIds } from "@/lib/services/registration-service";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/utils";

// Define your color palettes here
const THEMES = {
  dark: {
    border: "rounded",
  },
};

/**
 * Fetches a Stripe client secret for checkout.
 * @param registrationIds - Optional array of registration IDs to filter.
 *                          If not provided, uses all draft registrations.
 */
export async function fetchClientSecret(registrationIds?: string[]) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  if (!registrationIds?.length) {
    throw new Error("Please specify the registrations you wish to pay for");
  }

  // Fetch registrations - either specific IDs or all draft registrations
  const user = await getRegistrationsByIds(userId, registrationIds);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (!user) {
    throw new Error("No user.");
  }

  user.campers.forEach((camper) => {
    camper.registrations.forEach((reg) => {
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
      });
    });
  });

  if (!lineItems.length) {
    return null;
  }

  const palette = THEMES.dark;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: lineItems,
    mode: "payment",
    return_url: `${getBaseUrl()}/registration/checkout/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    automatic_tax: { enabled: true },
    branding_settings: {
      display_name: "Mulhurst Camp", // TODO: Update to pull this from config somehow
      font_family: "roboto",
      border_style: "rounded",
    },
  });

  return session.client_secret ?? "";
}
