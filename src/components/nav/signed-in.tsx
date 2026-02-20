"use client";

import clsx from "clsx";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Session } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { hasAdminPanelAccess } from "@/lib/auth-roles";
import Logo from "../ui/logo";

interface NavSignedInProps {
  initialSession: Session;
}

export default function NavSignedIn({ initialSession }: NavSignedInProps) {
  const { data: session } = authClient.useSession();
  const user = session?.user ?? initialSession.user;
  const router = useRouter();

  const role = user.role;
  const userName = user.name || user.email || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const showAdminLink = hasAdminPanelAccess(role);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="flex justify-between items-center p-4 gap-4 h-16 w-full bg-background border-b">
      <NavigationMenu className={showAdminLink ? clsx("pl-14 md:pl-0") : ""}>
        <NavigationMenuList className="flex gap-4">
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/">
                <Logo />
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex gap-4 items-center">
        <ThemeToggle />
        {showAdminLink && <Link href="/admin">Admin</Link>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <span className="text-sm font-medium">{userInitials}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{userName}</p>
                {user.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/registration/overview" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Registrations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
