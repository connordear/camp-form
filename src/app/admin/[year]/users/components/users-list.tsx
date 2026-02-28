"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  FilterIcon,
  MailIcon,
  SearchIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { User } from "@/app/admin/[year]/users/schema";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { UserModal } from "./user-modal";

interface UsersListProps {
  users: User[];
  year: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentSearch: string;
  currentRole: string;
}

const ITEMS_PER_PAGE = 10;

const SEARCH_PARAMS = {
  SEARCH: "search",
  ROLE: "role",
  PAGE: "page",
} as const;

export function UsersList({
  users,
  year,
  totalCount,
  totalPages,
  currentPage,
  currentSearch,
  currentRole,
}: UsersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalSearch(currentSearch);
    }
  }, [currentSearch]);

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

      if (key !== SEARCH_PARAMS.PAGE) {
        params.delete(SEARCH_PARAMS.PAGE);
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, createQueryString],
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage registered users for {year}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={localSearch}
            onChange={(e) => {
              isTypingRef.current = true;
              setLocalSearch(e.target.value);
              debouncedUpdateSearch(SEARCH_PARAMS.SEARCH, e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Select
            value={currentRole}
            onValueChange={(value) =>
              updateSearchParam(SEARCH_PARAMS.ROLE, value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="hcp">HCP</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[120px] sm:max-w-none">Name</TableHead>
                <TableHead className="max-w-[140px] sm:max-w-none">Email</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Registrations
                </TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">
                  Registered
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {totalCount === 0
                      ? "No users found."
                      : "No users match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell className="max-w-32">
                      <span className="font-medium truncate block">
                        {user.name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-40">
                      <div className="flex items-center gap-2 min-w-0">
                        <MailIcon className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.registrationCount}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} of {totalCount}{" "}
            users
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

      <UserModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        year={year}
      />
    </div>
  );
}
