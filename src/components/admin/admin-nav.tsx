"use client";

import { MenuIcon, TentIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { YearSelector } from "./year-selector";

interface AdminNavProps {
  availableYears: number[];
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
  const searchParams = useSearchParams();

  // Preserve search params when navigating
  const fullHref = searchParams.toString()
    ? `${href}?${searchParams.toString()}`
    : href;

  const isActive = pathname.startsWith(href);

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

function AdminNavContent({ availableYears }: AdminNavProps) {
  return (
    <>
      {/* Desktop Sidebar - full width */}
      <div className="hidden lg:flex w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col p-4">
        <nav className="flex flex-col gap-1">
          <AdminNavLink href="/admin/registrations" icon={UsersIcon}>
            Registrations
          </AdminNavLink>
          <AdminNavLink href="/admin/camps" icon={TentIcon}>
            Camps
          </AdminNavLink>
        </nav>

        <div className="mt-auto pt-4 border-t">
          <YearSelector availableYears={availableYears} />
        </div>
      </div>

      {/* Tablet Sidebar - collapsed icon-only */}
      <div className="hidden md:flex lg:hidden w-14 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col items-center py-4">
        <nav className="flex flex-col gap-1 w-full px-2">
          <AdminNavLink href="/admin/registrations" icon={UsersIcon} collapsed>
            Registrations
          </AdminNavLink>
          <AdminNavLink href="/admin/camps" icon={TentIcon} collapsed>
            Camps
          </AdminNavLink>
        </nav>

        <div className="mt-auto pt-4 border-t w-full flex justify-center">
          <YearSelector availableYears={availableYears} collapsed />
        </div>
      </div>
    </>
  );
}

function MobileNav({ availableYears }: AdminNavProps) {
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
              href="/admin/registrations"
              icon={UsersIcon}
              onClick={closeSheet}
            >
              Registrations
            </AdminNavLink>
            <AdminNavLink
              href="/admin/camps"
              icon={TentIcon}
              onClick={closeSheet}
            >
              Camps
            </AdminNavLink>
          </nav>

          <div className="mt-auto p-4 border-t absolute bottom-0 left-0 right-0">
            <YearSelector availableYears={availableYears} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AdminNav({ availableYears }: AdminNavProps) {
  return (
    <Suspense
      fallback={
        <div className="hidden md:flex w-64 lg:w-64 md:w-14 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 flex-col p-4">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <MobileNav availableYears={availableYears} />
      <AdminNavContent availableYears={availableYears} />
    </Suspense>
  );
}
