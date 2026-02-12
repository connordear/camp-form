"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  FilterIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { AdminRegistration } from "@/app/admin/[year]/registrations/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Camp {
  id: string;
  name: string;
}

interface RegistrationsListProps {
  registrations: AdminRegistration[];
  year: number;
  availableCamps: Camp[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentSearch: string;
  currentStatus: string;
  currentCamp: string;
}

const ITEMS_PER_PAGE = 10;

// Search param keys for type safety
const SEARCH_PARAMS = {
  SEARCH: "search",
  STATUS: "status",
  CAMP: "camp",
  PAGE: "page",
} as const;

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "registered":
      return "default";
    case "draft":
      return "secondary";
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return "N/A";
  return `$${(cents / 100).toFixed(2)}`;
}

export function RegistrationsList({
  registrations,
  year,
  availableCamps,
  totalCount,
  totalPages,
  currentPage,
  currentSearch,
  currentStatus,
  currentCamp,
}: RegistrationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const [localSearch, setLocalSearch] = useState(currentSearch);

  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalSearch(currentSearch);
    }
  }, [currentSearch]);

  // Create a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "all" && value !== "") {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams],
  );

  const debouncedUpdateSearch = useCallback(
    (key: string, value: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        const params = new URLSearchParams(createQueryString(key, value));

        // Reset page when filters change
        if (key !== SEARCH_PARAMS.PAGE) {
          params.delete(SEARCH_PARAMS.PAGE);
        }

        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }, 300);
    },
    [router, pathname, createQueryString],
  );

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(createQueryString(key, value));

      // Reset page when filters change
      if (key !== SEARCH_PARAMS.PAGE) {
        params.delete(SEARCH_PARAMS.PAGE);
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, createQueryString],
  );

  // Calculate summary stats from ALL registrations (not filtered)
  // Note: These should come from the server in a real implementation
  // For now, we'll calculate from the passed registrations
  const totalRevenue = registrations
    .filter((r) => r.status === "registered")
    .reduce((sum, r) => sum + (r.pricePaid || 0), 0);

  const registeredCount = registrations.filter(
    (r) => r.status === "registered",
  ).length;
  const draftCount = registrations.filter((r) => r.status === "draft").length;
  const refundedCount = registrations.filter(
    (r) => r.status === "refunded",
  ).length;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
      {/* Header with title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Registrations</h1>
          <p className="text-muted-foreground">
            Manage camp registrations for {year}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registeredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by camper or camp..."
            value={localSearch}
            onChange={(e) => {
              isTypingRef.current = true;
              setLocalSearch(e.target.value);
              debouncedUpdateSearch(SEARCH_PARAMS.SEARCH, e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={currentCamp}
            onValueChange={(value) =>
              updateSearchParam(SEARCH_PARAMS.CAMP, value)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by camp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {availableCamps.map((camp) => (
                <SelectItem key={camp.id} value={camp.id}>
                  {camp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Select
            value={currentStatus}
            onValueChange={(value) =>
              updateSearchParam(SEARCH_PARAMS.STATUS, value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Registrations Table */}
      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camper</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Price Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price Paid</TableHead>
                <TableHead>Registered On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {totalCount === 0
                      ? "No registrations found for this year."
                      : "No registrations match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="size-4 text-muted-foreground" />
                        <span className="font-medium">
                          {reg.camper.firstName} {reg.camper.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {reg.campYear.camp.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reg.campYear.year}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{reg.price?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(reg.status)}>
                        {reg.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(reg.pricePaid)}</TableCell>
                    <TableCell>
                      {format(new Date(reg.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} of {totalCount}{" "}
            registrations
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateSearchParam(
                  SEARCH_PARAMS.PAGE,
                  (currentPage - 1).toString(),
                )
              }
              disabled={currentPage === 1 || isPending}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateSearchParam(
                  SEARCH_PARAMS.PAGE,
                  (currentPage + 1).toString(),
                )
              }
              disabled={currentPage === totalPages || isPending}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
