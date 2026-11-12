import { redirect } from "next/navigation";
import { adminPage } from "@/lib/auth-helpers";

async function CampgroundAdminPage(): Promise<never> {
  redirect("/admin/campground/bookings");
}

export default adminPage(CampgroundAdminPage);
