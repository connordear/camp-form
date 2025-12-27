import type { Registration } from "@/lib/types/registration-types";
import { Badge } from "../ui/badge";

type RegistrationBadgeProps = {
  status: Registration["status"];
};

const statusLookup: Record<
  Registration["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  draft: "secondary",
  registered: "default",
  refunded: "outline",
};

export default function RegistrationBadge({ status }: RegistrationBadgeProps) {
  return <Badge variant={statusLookup[status]}>{status.toUpperCase()}</Badge>;
}
