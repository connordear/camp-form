import { adminPage } from "@/lib/auth-helpers";
import {
  getAllSites,
  getBookingCountsBySite,
} from "@/lib/services/campground-service";
import { SitesList } from "./components/sites-list";

async function CampgroundSitesPage() {
  const [sites, bookingCounts] = await Promise.all([
    getAllSites(),
    getBookingCountsBySite(),
  ]);

  return <SitesList sites={sites} bookingCounts={bookingCounts} />;
}

export default adminPage(CampgroundSitesPage);
