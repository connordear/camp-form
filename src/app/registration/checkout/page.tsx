import { getUpcomingCampYear } from "@/lib/services/home-service";
import { getCheckoutData } from "./actions";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  // Same year the overview registers for; with no upcoming camps there is
  // nothing to check out, so the calendar year only labels the empty page.
  const year = (await getUpcomingCampYear()) ?? new Date().getFullYear();
  const campers = await getCheckoutData(year);

  return <CheckoutClient campers={campers} year={year} />;
}
