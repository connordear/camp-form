import type { RegistrationStatus } from "@/lib/types/common-types";
import { Badge } from "../ui/badge";

type RegistrationBadgeProps = {
  status: RegistrationStatus;
};

const statusLookup: Record<
  RegistrationStatus,
  "default" | "outline" | "secondary" | "destructive"
> = {
  draft: "secondary",
  registered: "default",
  refunded: "outline",
};

export default function RegistrationBadge({ status }: RegistrationBadgeProps) {
  return <Badge variant={statusLookup[status]}>{status.toUpperCase()}</Badge>;
}
