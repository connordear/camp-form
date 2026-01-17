import { auth } from "@clerk/nextjs/server";
import { getRegistrationDetailsForUser } from "@/lib/services/registration-service";

export async function getRegistrations() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const res = await getRegistrationDetailsForUser(userId);

  const regs = res?.campers.flatMap((c) => c.registrations) ?? [];
  return regs;
}
