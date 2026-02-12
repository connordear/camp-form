import { getAllDiscountsForAdmin } from "./actions";
import { DiscountsList } from "./components/discounts-list";

interface DiscountsYearPageProps {
  params: Promise<{ year: string }>;
}

export default async function DiscountsYearPage({
  params,
}: DiscountsYearPageProps) {
  // Parse year from path param (not used for discounts, but part of URL structure)
  await params;

  // Fetch discounts for the admin (includes admin check)
  const discounts = await getAllDiscountsForAdmin(undefined);

  return <DiscountsList discounts={discounts} />;
}
