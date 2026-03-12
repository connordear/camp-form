import Link from "next/link";
import { fetchClientSecret } from "./actions";
import CheckoutForm from "./checkout-form";

type PaymentPageProps = {
  searchParams: Promise<{ ids?: string; codes?: string }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { ids, codes } = await searchParams;

  const registrationIds = ids
    ? ids.split(",").filter((id) => id.trim())
    : undefined;

  const bursaryCodes = codes
    ? codes.split(",").filter((code) => code.trim())
    : undefined;

  const clientSecret = await fetchClientSecret(
    registrationIds,
    bursaryCodes,
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
