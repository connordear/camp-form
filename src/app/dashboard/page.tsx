import { currentUser } from "@clerk/nextjs/server";
import { getCamps, getRegistrationsForUser } from "./actions";
import RegistrationForm from "./registration-form";

export default async function DashboardPage() {
  const campsPromise = getCamps();
  const clerkUser = await currentUser();
  const userPromise = clerkUser ? getRegistrationsForUser(clerkUser.id) : null;

  const [camps, user] = await Promise.all([campsPromise, userPromise]);

  if (!user) return "Not Found";

  return <RegistrationForm camps={camps} user={user} />;
}
