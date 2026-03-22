import Link from "next/link";
import { fetchClientSecret } from "./actions";
import CheckoutForm from "./checkout-form";

type PaymentPageProps = {
  searchParams: Promise<{ ids?: string; applied?: string }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { ids, applied } = await searchParams;

  const registrationIds = ids
    ? ids.split(",").filter((id) => id.trim())
    : undefined;

  const appliedDiscountIds = applied
    ? applied.split(",").filter((id) => id.trim())
    : [];

  const clientSecret = await fetchClientSecret(
    registrationIds,
    appliedDiscountIds,
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
