"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ThemeProvider } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

export default function CheckoutForm({
  clientSecret,
}: {
  clientSecret: string;
}) {
  return (
    <ThemeProvider forcedTheme="dark">
      <Card className="w-full max-w-[1080px] m-auto p-0 border-r-2 overflow-clip">
        <CardContent className="p-0 m-0">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}
