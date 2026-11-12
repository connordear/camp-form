import { adminPage } from "@/lib/auth-helpers";
import {
  getAllSites,
  getBookingCountsBySite,
  getSiteIdsWithBlockedNights,
} from "@/lib/services/campground-service";
import { MapPlacement } from "./components/map-placement";
import { SitesList } from "./components/sites-list";

async function CampgroundSitesPage() {
  const [sites, bookingCounts, blockedSiteIds] = await Promise.all([
    getAllSites(),
    getBookingCountsBySite(),
    getSiteIdsWithBlockedNights(),
  ]);

  return (
    <div className="space-y-6">
      <SitesList
        sites={sites}
        bookingCounts={bookingCounts}
        blockedSiteIds={blockedSiteIds}
      />
      {/* Start fresh when sites are added or removed. */}
      <MapPlacement key={sites.map((s) => s.id).join()} sites={sites} />
    </div>
  );
}

export default adminPage(CampgroundSitesPage);
