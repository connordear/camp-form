import { getCampsForYear, getRegistrations } from "./actions";
import OverviewForm from "./form";

export default async function OverviewPage() {
  const campsPromise = getCampsForYear();
  const userPromise = getRegistrations();

  const [camps, user] = await Promise.all([campsPromise, userPromise]);

  if (!user) return "Not Found";

  return <OverviewForm camps={camps} user={user} />;
}
