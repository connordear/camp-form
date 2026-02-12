"use client";

import { useParams } from "next/navigation";
import { parseYearParam } from "@/app/admin/[year]/utils";

export function useAdminYear() {
  const params = useParams<{ year: string }>();
  const currentYear = parseYearParam(params.year);

  return { currentYear };
}
