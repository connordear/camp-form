"use server";
import { auth } from "@clerk/nextjs/server";
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

  const user = await getCheckoutRegistrationsForUser(userId);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (!user) {
    throw new Error("No user.");
  }

  user.campers.forEach((camper) => {
    camper.registrations.forEach((reg) => {
      if (reg.numDays && reg.campYear.dayPrice) {
        lineItems.push({
          price_data: {
            currency: "cad",
            unit_amount: reg.campYear.dayPrice,
            product_data: {
              name: `${camper.firstName} ${camper.lastName} - ${reg.campYear?.camp.name} - ${reg.numDays} Days`,
              metadata: {
                userId: user.id,
                registrationId: reg.id,
                camperName: `${camper.firstName} ${camper.lastName}`,
                camp: `${reg.campYear.year} ${reg.campYear.camp.name}`,
                numDays: reg.numDays,
              },
            },
          },
          quantity: reg.numDays,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: "cad",
            unit_amount: reg.campYear.basePrice,
            product_data: {
              name: `${camper.firstName} ${camper.lastName} - ${reg.campYear?.camp.name} - Full Week`,
              metadata: {
                userId: user.id,
                registrationId: reg.id,
                camperName: `${camper.firstName} ${camper.lastName}`,
                camp: `${reg.campYear.year} ${reg.campYear.camp.name}`,
              },
            },
          },
          quantity: 1,
        });
      }
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
    return_url: `${getBaseUrl()}/registration/overview?session_id={CHECKOUT_SESSION_ID}`,
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
