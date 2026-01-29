import { getCheckoutData } from "./actions";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  const year = new Date().getFullYear();
  const campers = await getCheckoutData(year);

  return <CheckoutClient campers={campers} year={year} />;
}
