"use client";

import { authClient } from "@/lib/auth-client";
import NavSignedIn from "./signed-in";
import NavSignedOut from "./signed-out";

export default function AuthNav() {
  const { data: session, isPending } = authClient.useSession();

  // Show a minimal loading state to prevent flash
  if (isPending) {
    return (
      <header className="flex justify-between items-center p-4 gap-4 h-16 w-full bg-background border-b">
        <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        <div className="flex gap-4 items-center">
          <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
        </div>
      </header>
    );
  }

  return session ? <NavSignedIn /> : <NavSignedOut />;
}
