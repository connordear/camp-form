import { adminPage } from "@/lib/auth-helpers";
import {
  getAllSites,
  getBookingCountsBySite,
} from "@/lib/services/campground-service";
import { MapPlacement } from "./components/map-placement";
import { SitesList } from "./components/sites-list";

async function CampgroundSitesPage() {
  const [sites, bookingCounts] = await Promise.all([
    getAllSites(),
    getBookingCountsBySite(),
  ]);

  return (
    <div className="space-y-6">
      <SitesList sites={sites} bookingCounts={bookingCounts} />
      {/* Start fresh when sites are added or removed. */}
      <MapPlacement key={sites.map((s) => s.id).join()} sites={sites} />
    </div>
  );
}

export default adminPage(CampgroundSitesPage);
