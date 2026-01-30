"use client";

import { TentIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { YearSelector } from "./year-selector";

interface AdminNavProps {
  availableYears: number[];
}

function AdminNavLink({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Preserve search params when navigating
  const fullHref = searchParams.toString()
    ? `${href}?${searchParams.toString()}`
    : href;

  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={fullHref}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

function AdminNavContent({ availableYears }: AdminNavProps) {
  return (
    <div className="w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col p-4">
      <div className="font-semibold text-lg mb-6">
        <span className="text-muted-foreground">Admin</span>
      </div>

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
  );
}

export function AdminNav({ availableYears }: AdminNavProps) {
  return (
    <Suspense
      fallback={
        <div className="w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-background/95 flex flex-col p-4">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <AdminNavContent availableYears={availableYears} />
    </Suspense>
  );
}
