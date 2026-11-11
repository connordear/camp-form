// Route rules used by src/proxy.ts. Kept free of server imports so they can
// be unit tested.
import { ADMIN_PANEL_ROLES, ADMIN_ROLES } from "@/lib/auth-roles";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/campground",
  "/help/(.*)",
  "/api/auth/(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
];

// First match wins, so the catch-all must stay last. Year-scoped camp admin
// URLs look like /admin/2026/users. These are a second layer of protection:
// every page and action still checks the role itself (adminPage/adminAction).
const adminRouteRoles: Array<{ pattern: string; roles: readonly string[] }> = [
  { pattern: "/admin/[^/]+/users(/.*)?", roles: ADMIN_ROLES },
  { pattern: "/admin/[^/]+/discounts(/.*)?", roles: ADMIN_ROLES },
  { pattern: "/admin/[^/]+/camps(/.*)?", roles: ADMIN_ROLES },
  { pattern: "/admin/campground(/.*)?", roles: ADMIN_ROLES },
  { pattern: "/admin(.*)", roles: ADMIN_PANEL_ROLES },
];

function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(pathname);
  });
}

export function getAllowedRolesForPath(
  pathname: string,
): readonly string[] | null {
  for (const route of adminRouteRoles) {
    const regex = new RegExp(`^${route.pattern}$`);
    if (regex.test(pathname)) {
      return route.roles;
    }
  }
  return null;
}

export function isPublicRoute(pathname: string): boolean {
  return matchesPattern(pathname, publicRoutes);
}
