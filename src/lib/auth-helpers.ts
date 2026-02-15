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

/**
 * Require admin panel access (admin, hcp, or staff).
 * Throws an error if not authenticated or not authorized.
 */
export async function requireAdminPanelAccess(): Promise<Session> {
  const session = await requireAuth();
  const allowedRoles = ["admin", "hcp", "staff"];
  if (!allowedRoles.includes(session.user.role ?? "")) {
    throw new Error("Unauthorized: Admin panel access required");
  }
  return session;
}

/**
 * Require medical info access (admin or hcp only).
 * Throws an error if not authenticated or not authorized.
 */
export async function requireMedicalAccess(): Promise<Session> {
  const session = await requireAuth();
  const medicalRoles = ["admin", "hcp"];
  if (!medicalRoles.includes(session.user.role ?? "")) {
    throw new Error("Unauthorized: Medical info access required");
  }
  return session;
}

/**
 * Require admin-only access for sensitive data (payment amounts).
 * Throws an error if not authenticated or not an admin.
 */
export async function requireAdminOnly(): Promise<Session> {
  const session = await requireAuth();
  if ((session.user.role ?? "") !== "admin") {
    throw new Error("Unauthorized: Admin-only access required");
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

/**
 * Wrapper for server actions accessible to admin, hcp, and staff.
 */
export function adminPanelAction<T, R>(
  action: ServerAction<T, R>,
): ServerAction<T, R> {
  return async (data: T): Promise<R> => {
    const session = await getSession();
    const allowedRoles = ["admin", "hcp", "staff"];
    if (!session || !allowedRoles.includes(session.user.role ?? "")) {
      throw new Error("Unauthorized: Admin panel access required");
    }
    return action(data);
  };
}

/**
 * Wrapper for server actions accessible to admin and hcp (medical access).
 */
export function medicalAccessAction<T, R>(
  action: ServerAction<T, R>,
): ServerAction<T, R> {
  return async (data: T): Promise<R> => {
    const session = await getSession();
    const medicalRoles = ["admin", "hcp"];
    if (!session || !medicalRoles.includes(session.user.role ?? "")) {
      throw new Error("Unauthorized: Medical info access required");
    }
    return action(data);
  };
}

/**
 * Wrapper for server actions accessible to admin only (sensitive data like payments).
 */
export function adminOnlyAction<T, R>(
  action: ServerAction<T, R>,
): ServerAction<T, R> {
  return async (data: T): Promise<R> => {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized: Admin-only access required");
    }
    return action(data);
  };
}
