"use client";

import { CalendarPlusIcon, ListIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/campground",
    label: "Book a site",
    icon: CalendarPlusIcon,
    // The booking form is part of this tab.
    isActive: (p: string) =>
      p === "/campground" ||
      p.startsWith("/campground/book?") ||
      p === "/campground/book",
  },
  {
    href: "/campground/bookings",
    label: "My bookings",
    icon: ListIcon,
    isActive: (p: string) => p.startsWith("/campground/bookings"),
  },
];

/** Vertical on wide screens, a row of tabs on phones. */
export function CampgroundTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Campground" className="md:w-48 md:shrink-0 md:pt-8">
      <ul className="flex gap-1 md:flex-col border-b md:border-b-0 md:border-r md:pr-3 pb-2 md:pb-0">
        {TABS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
