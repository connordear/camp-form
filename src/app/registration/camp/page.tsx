import { getRegistrations } from "./actions";
import CampForm from "./form";

export default async function CampPage() {
  const registrations = await getRegistrations();

  return <CampForm registrations={registrations ?? []} />;
}
