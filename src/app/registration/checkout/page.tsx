import { fetchClientSecret } from "./actions";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage() {
  const clientSecret = await fetchClientSecret();
  if (!clientSecret) {
    return <div>No valid registrations</div>;
  }
  return <CheckoutForm clientSecret={clientSecret} />;
}
