import { getUpcomingCampYear } from "@/lib/services/home-service";
import { getCampsForYear, getRegistrations } from "./actions";
import OverviewForm from "./form";

export default async function OverviewPage() {
  // Families register for the next camps not yet over, which in the fall
  // means next summer, not the calendar year. Camps and registrations both
  // come from that year so every registration has its camp in the list.
  const year = await getUpcomingCampYear();
  const [camps, user] = await Promise.all([
    year === null ? [] : getCampsForYear(year),
    getRegistrations(year),
  ]);
  if (!user) return "Not Found";

  return <OverviewForm camps={camps} user={user} />;
}
