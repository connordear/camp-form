"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CheckoutCamper, CheckoutRegistration } from "./actions";

type CamperCardProps = {
  camper: CheckoutCamper;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

const statusConfig = {
  incomplete: {
    label: "Incomplete",
    variant: "destructive" as const,
  },
  ready: {
    label: "Ready",
    variant: "secondary" as const,
  },
  paid: {
    label: "Paid",
    variant: "default" as const,
  },
  refunded: {
    label: "Refunded",
    variant: "outline" as const,
  },
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function RegistrationRow({
  registration,
  selected,
  onToggle,
}: {
  registration: CheckoutRegistration;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const { status, incompleteSteps } = registration;
  const config = statusConfig[status];
  const canSelect = status === "ready";

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {canSelect && (
            <input
              id={`reg-${registration.id}`}
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(registration.id)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{registration.campName}</span>
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {registration.campDates}
              {registration.numDays && ` (${registration.numDays} days)`}
            </p>
          </div>
        </div>
        <span className="font-semibold whitespace-nowrap">
          {formatPrice(registration.price)}
        </span>
      </div>

      {status === "incomplete" && incompleteSteps && (
        <div className="border-destructive/20 bg-destructive/5 mt-2 rounded-md border p-2">
          <p className="text-destructive text-xs font-medium">
            Missing:{" "}
            {incompleteSteps.map((step, i) => (
              <span key={step.step}>
                {i > 0 && ", "}
                <Link
                  href={`/registration/${step.step}`}
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {step.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}
    </>
  );

  if (canSelect) {
    return (
      <label
        htmlFor={`reg-${registration.id}`}
        className={cn(
          "block rounded-lg border p-3 transition-colors cursor-pointer hover:border-primary/50",
          selected && "border-primary bg-primary/5",
        )}
      >
        {content}
      </label>
    );
  }

  return (
    <div className="rounded-lg border p-3 transition-colors">{content}</div>
  );
}

export function CamperCard({ camper, selectedIds, onToggle }: CamperCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{camper.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {camper.registrations.map((registration) => (
          <RegistrationRow
            key={registration.id}
            registration={registration}
            selected={selectedIds.has(registration.id)}
            onToggle={onToggle}
          />
        ))}
      </CardContent>
    </Card>
  );
}
