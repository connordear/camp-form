import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { JSX } from "react";
import { auth, type Session } from "@/lib/auth";
import {
  ADMIN_PANEL_ROLES,
  ADMIN_ROLES,
  type AdminPanelRole,
  MEDICAL_ROLES,
  type MedicalRole,
} from "./auth-roles";

export {
  ADMIN_PANEL_ROLES,
  ADMIN_ROLES,
  type AdminPanelRole,
  type AdminRole,
  hasAdminPanelAccess,
  hasMedicalAccess,
  isAdmin,
  MEDICAL_ROLES,
  type MedicalRole,
} from "./auth-roles";

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
  if (!ADMIN_PANEL_ROLES.includes(session.user.role as AdminPanelRole)) {
    throw new Error("Unauthorized: Admin panel access required");
  }
  return session;
}

export async function requireMedicalAccess(): Promise<Session> {
  const session = await requireAuth();
  if (!MEDICAL_ROLES.includes(session.user.role as MedicalRole)) {
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
    if (
      !session ||
      !ADMIN_PANEL_ROLES.includes(session.user.role as AdminPanelRole)
    ) {
      throw new Error("Unauthorized: Admin panel access required");
    }
    return action(data);
  };
}

export function medicalAccessAction<T, R>(
  action: ServerAction<T, R>,
): ServerAction<T, R> {
  return async (data: T): Promise<R> => {
    const session = await getSession();
    if (!session || !MEDICAL_ROLES.includes(session.user.role as MedicalRole)) {
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

type PageComponent<P> = (props: P) => Promise<JSX.Element>;

function withRoles(roles: string[]) {
  return <P extends object>(Page: PageComponent<P>): PageComponent<P> => {
    return async (props: P): Promise<JSX.Element> => {
      const session = await getSession();
      if (!session || !roles.includes(session.user.role ?? "")) {
        redirect("/");
      }
      return Page(props);
    };
  };
}

export const adminPage = withRoles([...ADMIN_ROLES]);
export const adminPanelPage = withRoles([...ADMIN_PANEL_ROLES]);
export const medicalPage = withRoles([...MEDICAL_ROLES]);
