import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth";

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Require authentication. Throws an error if not authenticated.
 * Returns the session if authenticated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Must be logged in");
  }
  return session;
}

/**
 * Require admin role. Throws an error if not authenticated or not an admin.
 * Returns the session if authenticated and is admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

type ServerAction<T, R> = (data: T) => Promise<R>;

export function adminAction<T, R>(
  action: ServerAction<T, R>,
): ServerAction<T, R> {
  return async (data: T): Promise<R> => {
    const session = await getSession();

    // Check strict admin role
    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    return action(data);
  };
}
