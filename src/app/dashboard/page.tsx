import { currentUser } from "@clerk/nextjs/server";
import { getRegistrationsForUser } from "./actions";
import RegistrationForm from "./registration-form";

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  const user = clerkUser ? await getRegistrationsForUser(clerkUser.id) : null;

  if (!user) return "Not Found";

  return (
    <RegistrationForm user={user} />
  )
}
