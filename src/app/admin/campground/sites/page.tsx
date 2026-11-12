import { adminPage } from "@/lib/auth-helpers";
import {
  getAllSites,
  getBookingCountsBySite,
  getSiteIdsWithBlockedNights,
} from "@/lib/services/campground-service";
import { SitesList } from "./components/sites-list";

async function CampgroundSitesPage() {
  const [sites, bookingCounts, blockedSiteIds] = await Promise.all([
    getAllSites(),
    getBookingCountsBySite(),
    getSiteIdsWithBlockedNights(),
  ]);

  return (
    <SitesList
      sites={sites}
      bookingCounts={bookingCounts}
      blockedSiteIds={blockedSiteIds}
    />
  );
}

export default adminPage(CampgroundSitesPage);
