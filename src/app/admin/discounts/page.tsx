import { DiscountsList } from "@/components/admin/discounts-list";
import { getAllDiscounts } from "@/lib/services/discount-service";

export default async function DiscountsPage() {
  const discounts = await getAllDiscounts();

  return <DiscountsList discounts={discounts} />;
}
