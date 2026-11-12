"use client";

import {
  CalendarDaysIcon,
  MapPinIcon,
  MenuIcon,
  SettingsIcon,
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

type AdminRoleName = "admin" | "hcp" | "staff";

interface AdminNavProps {
  availableYears: number[];
  userRole: AdminRoleName;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  /** Year-scoped links are built as /admin/{year}{href}. */
  yearScoped: boolean;
  adminOnly?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Camp",
    yearScoped: true,
    items: [
      { href: "/registrations", label: "Registrations", icon: UsersIcon },
      { href: "/camps", label: "Camps", icon: TentIcon, adminOnly: true },
      {
        href: "/discounts",
        label: "Discounts",
        icon: TagIcon,
        adminOnly: true,
      },
      {
        href: "/users",
        label: "Users",
        icon: UserCircleIcon,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Campground",
    yearScoped: false,
    adminOnly: true,
    items: [
      {
        href: "/admin/campground/bookings",
        label: "Bookings",
        icon: CalendarDaysIcon,
      },
      { href: "/admin/campground/sites", label: "Sites", icon: MapPinIcon },
      {
        href: "/admin/campground/settings",
        label: "Settings",
        icon: SettingsIcon,
      },
    ],
  },
];

function visibleGroups(userRole: AdminRoleName): NavGroup[] {
  const isAdmin = userRole === "admin";
  return NAV_GROUPS.filter((g) => isAdmin || !g.adminOnly)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => isAdmin || !i.adminOnly),
    }))
    .filter((g) => g.items.length > 0);
}

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  yearScoped?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function AdminNavLink({
  href,
  children,
  icon: Icon,
  yearScoped = true,
  collapsed = false,
  onClick,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const { currentYear } = useAdminYear();

  // Year-scoped links: /admin/2025/registrations. Others are used as given.
  const fullHref = yearScoped ? `/admin/${currentYear}${href}` : href;

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

interface NavGroupsProps {
  availableYears: number[];
  userRole: AdminRoleName;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function NavGroups({
  availableYears,
  userRole,
  collapsed = false,
  onNavigate,
}: NavGroupsProps) {
  return (
    <nav className="flex flex-col gap-4 w-full">
      {visibleGroups(userRole).map((group, index) => (
        <div
          key={group.label}
          className={cn(
            "flex flex-col gap-1",
            collapsed && index > 0 && "border-t pt-4",
          )}
        >
          {!collapsed && (
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
          )}
          {group.yearScoped && (
            <div
              className={cn("pb-1", collapsed ? "flex justify-center" : "px-1")}
            >
              <YearSelector
                availableYears={availableYears}
                collapsed={collapsed}
              />
            </div>
          )}
          {group.items.map((item) => (
            <AdminNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              yearScoped={group.yearScoped}
              collapsed={collapsed}
              onClick={onNavigate}
            >
              {item.label}
            </AdminNavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function AdminNavContent({ availableYears, userRole }: AdminNavProps) {
  return (
    <>
      {/* Desktop Sidebar - full width */}
      <div className="hidden lg:flex w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col p-4">
        <NavGroups availableYears={availableYears} userRole={userRole} />
      </div>

      {/* Tablet Sidebar - collapsed icon-only */}
      <div className="hidden md:flex lg:hidden w-14 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col items-center py-4 px-2">
        <NavGroups
          availableYears={availableYears}
          userRole={userRole}
          collapsed
        />
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

          <div className="p-4">
            <NavGroups
              availableYears={availableYears}
              userRole={userRole}
              onNavigate={closeSheet}
            />
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
