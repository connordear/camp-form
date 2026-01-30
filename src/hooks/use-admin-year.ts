"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const YEAR_PARAM = "year";

export function useAdminYear() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentYear = useMemo(() => {
    const yearParam = searchParams.get(YEAR_PARAM);
    if (yearParam) {
      const parsed = parseInt(yearParam, 10);
      if (!isNaN(parsed) && parsed >= 2000) {
        return parsed;
      }
    }
    return new Date().getFullYear();
  }, [searchParams]);

  const setYear = useCallback(
    (year: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(YEAR_PARAM, year.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return { currentYear, setYear };
}
