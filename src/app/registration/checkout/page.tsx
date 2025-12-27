import { fetchClientSecret } from "./actions";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage() {
  const clientSecret = await fetchClientSecret();
  return <CheckoutForm clientSecret={clientSecret} />;
}
