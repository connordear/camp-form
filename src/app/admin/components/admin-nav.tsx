"use client";

import {
  MenuIcon,
  TagIcon,
  TentIcon,
  UserCircleIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminYear } from "@/hooks/use-admin-year";
import { cn } from "@/lib/utils";
import { YearSelector } from "./year-selector";

interface AdminNavProps {
  availableYears: number[];
  userRole: "admin" | "hcp" | "staff";
}

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  collapsed?: boolean;
  onClick?: () => void;
}

function AdminNavLink({
  href,
  children,
  icon: Icon,
  collapsed = false,
  onClick,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const { currentYear } = useAdminYear();

  // Build full href with year: /admin/2025/registrations
  const fullHref = `/admin/${currentYear}${href}`;

  const isActive = pathname.startsWith(fullHref);

  const linkContent = (
    <Link
      href={fullHref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        collapsed ? "justify-center" : "w-full",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && children}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{children}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function AdminNavContent({ availableYears, userRole }: AdminNavProps) {
  return (
    <>
      {/* Desktop Sidebar - full width */}
      <div className="hidden lg:flex w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col p-4">
        <nav className="flex flex-col gap-1">
          <AdminNavLink href="/registrations" icon={UsersIcon}>
            Registrations
          </AdminNavLink>
          {userRole === "admin" && (
            <>
              <AdminNavLink href="/camps" icon={TentIcon}>
                Camps
              </AdminNavLink>
              <AdminNavLink href="/discounts" icon={TagIcon}>
                Discounts
              </AdminNavLink>
              <AdminNavLink href="/users" icon={UserCircleIcon}>
                Users
              </AdminNavLink>
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t">
          <YearSelector availableYears={availableYears} />
        </div>
      </div>

      {/* Tablet Sidebar - collapsed icon-only */}
      <div className="hidden md:flex lg:hidden w-14 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col items-center py-4">
        <nav className="flex flex-col gap-1 w-full px-2">
          <AdminNavLink href="/registrations" icon={UsersIcon} collapsed>
            Registrations
          </AdminNavLink>
          {userRole === "admin" && (
            <>
              <AdminNavLink href="/camps" icon={TentIcon} collapsed>
                Camps
              </AdminNavLink>
              <AdminNavLink href="/discounts" icon={TagIcon} collapsed>
                Discounts
              </AdminNavLink>
              <AdminNavLink href="/users" icon={UserCircleIcon} collapsed>
                Users
              </AdminNavLink>
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t w-full flex justify-center">
          <YearSelector availableYears={availableYears} collapsed />
        </div>
      </div>
    </>
  );
}

function MobileNav({ availableYears, userRole }: AdminNavProps) {
  const [open, setOpen] = useState(false);

  const closeSheet = () => setOpen(false);

  return (
    <div className="md:hidden">
      {/* Fixed hamburger button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50"
          >
            <MenuIcon className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left text-muted-foreground">
              Admin
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 p-4">
            <AdminNavLink
              href="/registrations"
              icon={UsersIcon}
              onClick={closeSheet}
            >
              Registrations
            </AdminNavLink>
            {userRole === "admin" && (
              <>
                <AdminNavLink
                  href="/camps"
                  icon={TentIcon}
                  onClick={closeSheet}
                >
                  Camps
                </AdminNavLink>
                <AdminNavLink
                  href="/discounts"
                  icon={TagIcon}
                  onClick={closeSheet}
                >
                  Discounts
                </AdminNavLink>
                <AdminNavLink
                  href="/users"
                  icon={UserCircleIcon}
                  onClick={closeSheet}
                >
                  Users
                </AdminNavLink>
              </>
            )}
          </nav>

          <div className="mt-auto p-4 border-t absolute bottom-0 left-0 right-0">
            <YearSelector availableYears={availableYears} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AdminNav({ availableYears, userRole }: AdminNavProps) {
  return (
    <Suspense
      fallback={
        <div className="hidden md:flex w-64 lg:w-64 md:w-14 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 flex-col p-4">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <MobileNav availableYears={availableYears} userRole={userRole} />
      <AdminNavContent availableYears={availableYears} userRole={userRole} />
    </Suspense>
  );
}
