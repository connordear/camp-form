import type { FormStatus } from "@/lib/types/common-types";

import { Badge } from "../ui/badge";

type FormStatusProps = {
  status: FormStatus;
};

const statusLookup: Record<
  FormStatus,
  "default" | "outline" | "secondary" | "destructive"
> = {
  complete: "default",
  draft: "secondary",
};

export default function FormStatusBadge({ status }: FormStatusProps) {
  return <Badge variant={statusLookup[status]}>{status.toUpperCase()}</Badge>;
}
