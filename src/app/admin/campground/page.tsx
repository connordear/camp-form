import { redirect } from "next/navigation";
import { adminPage } from "@/lib/auth-helpers";

// TODO(Phase 3): redirect to /admin/campground/bookings once that page exists.
async function CampgroundAdminPage(): Promise<never> {
  redirect("/admin/campground/sites");
}

export default adminPage(CampgroundAdminPage);
