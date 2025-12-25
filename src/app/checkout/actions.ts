"use server";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getCheckoutRegistrationsForUser } from "@/lib/services/registration-service";
import { stripe } from "@/lib/stripe";
import { COLORS } from "@/lib/theme";
import { getBaseUrl } from "@/lib/utils";

// Define your color palettes here
const THEMES = {
  dark: {
    bg: COLORS.background,
    btn: COLORS.background, // Teal-400
    border: "rounded",
  },
};

export async function fetchClientSecret() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }
  const origin = (await headers()).get("origin");

  const user = await getCheckoutRegistrationsForUser(userId);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (!user) {
    throw new Error("No user.");
  }

  user.campers.forEach((camper) => {
    camper.registrations.forEach((reg) => {
      lineItems.push({
        price_data: {
          currency: "cad",
          unit_amount: reg.campYear.basePrice,
          product_data: {
            name: `${camper.name} - ${reg.campYear?.camp.name}`,
            metadata: {
              userId: user.id,
              registrationId: reg.id,
              camperName: camper.name,
              camp: `${reg.campYear.year} ${reg.campYear.camp.name}`,
            },
          },
        },
        quantity: 1,
      });
    });
  });

  const palette = THEMES.dark;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: lineItems,
    mode: "payment",
    return_url: `${getBaseUrl()}/return?session_id={CHECKOUT_SESSION_ID}`,
    automatic_tax: { enabled: true },
    branding_settings: {
      display_name: "Mulhurst Camp",
      font_family: "roboto",
      border_style: "rounded",
      background_color: palette.bg,
      button_color: palette.btn,
    },
  });

  return session.client_secret ?? "";
}
