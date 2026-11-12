import { getUpcomingCampYear } from "@/lib/services/home-service";
import { getCampsForYear, getRegistrations } from "./actions";
import OverviewForm from "./form";

export default async function OverviewPage() {
  const [year, user] = await Promise.all([
    getUpcomingCampYear(),
    getRegistrations(),
  ]);
  if (!user) return "Not Found";

  // Families register for the next camps not yet over, which in the fall
  // means next summer, not the calendar year.
  const camps = year === null ? [] : await getCampsForYear(year);

  return <OverviewForm camps={camps} user={user} />;
}
