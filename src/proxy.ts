import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/auth/(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
];

const adminRoutes = ["/admin(.*)"];

function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(pathname);
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if public route - allow through
  if (matchesPattern(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Protected routes require auth
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Admin routes require admin role
  if (matchesPattern(pathname, adminRoutes)) {
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
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
