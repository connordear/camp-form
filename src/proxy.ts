import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ADMIN_PANEL_ROLES, ADMIN_ROLES } from "@/lib/auth-helpers";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/help/(.*)",
  "/api/auth/(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
];

const adminRouteRoles: Array<{ pattern: string; roles: readonly string[] }> = [
  { pattern: "/admin/users(.*)", roles: ADMIN_ROLES },
  { pattern: "/admin/discounts(.*)", roles: ADMIN_ROLES },
  { pattern: "/admin/camps(.*)", roles: ADMIN_ROLES },
  { pattern: "/admin(.*)", roles: ADMIN_PANEL_ROLES },
];

function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(pathname);
  });
}

function getAllowedRolesForPath(pathname: string): readonly string[] | null {
  for (const route of adminRouteRoles) {
    const regex = new RegExp(`^${route.pattern}$`);
    if (regex.test(pathname)) {
      return route.roles;
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesPattern(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const allowedRoles = getAllowedRolesForPath(pathname);
  if (allowedRoles && !allowedRoles.includes(session.user.role ?? "")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
