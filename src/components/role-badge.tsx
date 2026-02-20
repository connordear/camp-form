import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function getRoleIcon(role: string | null): ReactNode {
  switch (role) {
    case "admin":
      return <ShieldAlert className="size-4" />;
    case "hcp":
      return <ShieldCheck className="size-4" />;
    case "staff":
      return <Shield className="size-4" />;
    default:
      return <ShieldQuestion className="size-4" />;
  }
}

export function getRoleBadgeClassName(role: string | null): string {
  switch (role) {
    case "admin":
      return "bg-destructive text-destructive-foreground";
    case "hcp":
      return "bg-emerald-500 text-white hover:bg-emerald-600";
    case "staff":
      return "bg-amber-500 text-white hover:bg-amber-600";
    default:
      return "";
  }
}

export function getRoleLabel(role: string | null): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "hcp":
      return "HCP";
    case "staff":
      return "Staff";
    default:
      return "User";
  }
}

interface RoleBadgeProps {
  role: string | null;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  return (
    <Badge className={`${getRoleBadgeClassName(role)} ${className}`}>
      {getRoleIcon(role)}
      <span className="ml-1">{getRoleLabel(role)}</span>
    </Badge>
  );
}
