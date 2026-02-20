import { adminPage } from "@/lib/auth-helpers";
import { getAllDiscountsForAdmin } from "./actions";
import { DiscountsList } from "./components/discounts-list";

interface DiscountsYearPageProps {
  params: Promise<{ year: string }>;
}

async function DiscountsYearPage({ params }: DiscountsYearPageProps) {
  await params;

  const discounts = await getAllDiscountsForAdmin(undefined);

  return <DiscountsList discounts={discounts} />;
}

export default adminPage(DiscountsYearPage);
