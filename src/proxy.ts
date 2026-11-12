import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authPathWithRedirect } from "@/lib/redirect";
import { getAllowedRolesForPath, isPublicRoute } from "@/lib/route-access";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Come back here after signing in. API calls just get sent to sign-in.
    const destination = pathname.startsWith("/api/")
      ? null
      : `${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(
      new URL(authPathWithRedirect("/sign-in", destination), request.url),
    );
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
