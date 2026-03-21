import Link from "next/link";
import { fetchClientSecret } from "./actions";
import CheckoutForm from "./checkout-form";

type PaymentPageProps = {
  searchParams: Promise<{ ids?: string; dismissed?: string }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { ids, dismissed } = await searchParams;

  // Parse registration IDs from query params
  const registrationIds = ids
    ? ids.split(",").filter((id) => id.trim())
    : undefined;

  // Parse dismissed discount IDs from query params
  const dismissedDiscountIds = dismissed
    ? dismissed.split(",").filter((id) => id.trim())
    : [];

  const clientSecret = await fetchClientSecret(
    registrationIds,
    dismissedDiscountIds,
  );

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">
          No valid registrations to pay for.
        </p>
        <Link
          href="/registration/checkout"
          className="text-primary hover:underline"
        >
          Back to checkout
        </Link>
      </div>
    );
  }

  return <CheckoutForm clientSecret={clientSecret} />;
}
