import { Suspense } from "react";
import { getSession } from "@/lib/auth-helpers";
import { parseYearParam } from "../utils";
import { getAvailableCamps, getRegistrationsForAdmin } from "./actions";
import { RegistrationsList } from "./components/registrations-list";

function RegistrationsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-muted rounded-lg animate-pulse h-28" />
        <div className="p-6 bg-muted rounded-lg animate-pulse h-28" />
        <div className="p-6 bg-muted rounded-lg animate-pulse h-28" />
        <div className="p-6 bg-muted rounded-lg animate-pulse h-28" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-10 flex-1 min-w-64 bg-muted rounded animate-pulse" />
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
      </div>

      {/* Table */}
      <div className="h-96 bg-muted rounded-lg animate-pulse" />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface RegistrationsYearPageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    camp?: string;
    page?: string;
  }>;
}

export default async function RegistrationsYearPage({
  params,
  searchParams,
}: RegistrationsYearPageProps) {
  const { year: yearParam } = await params;
  const searchParamsData = await searchParams;

  // Get session for user role (auth is handled by layout)
  const session = await getSession();
  const userRole = session?.user.role ?? "user";

  // Parse year from path param
  const validYear = parseYearParam(yearParam);

  // Parse search params with defaults
  const search = searchParamsData.search || "";
  const status = searchParamsData.status || "all";
  const camp = searchParamsData.camp || "all";
  const page = parseInt(searchParamsData.page || "1", 10);
  const validPage = Number.isNaN(page) || page < 1 ? 1 : page;

  // Fetch data using server action (includes admin check)
  const { registrations, totalCount, totalPages } =
    await getRegistrationsForAdmin({
      year: validYear,
      search,
      status,
      camp,
      page: validPage,
      pageSize: 10,
    });

  // Get available camps for the filter
  const availableCamps = await getAvailableCamps(validYear);

  return (
    <Suspense fallback={<RegistrationsListSkeleton />}>
      <RegistrationsList
        registrations={registrations}
        year={validYear}
        availableCamps={availableCamps}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={validPage}
        currentSearch={search}
        currentStatus={status}
        currentCamp={camp}
        userRole={userRole as "admin" | "hcp" | "staff"}
      />
    </Suspense>
  );
}
