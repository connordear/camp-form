"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CheckoutCamper } from "./actions";
import { CamperCard } from "./camper-card";

type CheckoutClientProps = {
  campers: CheckoutCamper[];
  year: number;
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export function CheckoutClient({ campers, year }: CheckoutClientProps) {
  const router = useRouter();

  // Flatten all registrations for easier processing
  const allRegistrations = useMemo(
    () => campers.flatMap((c) => c.registrations),
    [campers],
  );

  const readyRegistrations = useMemo(
    () => allRegistrations.filter((r) => r.status === "ready"),
    [allRegistrations],
  );

  // Initialize selection with all "ready" registrations pre-selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(readyRegistrations.map((r) => r.id));
  });

  const selectedRegistrations = useMemo(
    () => allRegistrations.filter((r) => selectedIds.has(r.id)),
    [allRegistrations, selectedIds],
  );

  const totalPrice = useMemo(
    () => selectedRegistrations.reduce((sum, r) => sum + r.price, 0),
    [selectedRegistrations],
  );

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(readyRegistrations.map((r) => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCheckout = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(",");
    router.push(`/registration/checkout/payment?ids=${ids}`);
  };

  const hasCampers = campers.length > 0;
  const totalRegistrations = allRegistrations.length;
  const hasReadyRegistrations = readyRegistrations.length > 0;
  const allSelected =
    readyRegistrations.length > 0 &&
    selectedIds.size === readyRegistrations.length;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Registrations for {year}</h1>
          <p className="text-muted-foreground">
            {hasCampers
              ? `${totalRegistrations} registration${totalRegistrations !== 1 ? "s" : ""} across ${campers.length} camper${campers.length !== 1 ? "s" : ""}`
              : "No registrations found for this year"}
          </p>
        </div>
        {hasReadyRegistrations && (
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? handleDeselectAll : handleSelectAll}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        )}
      </div>

      {/* Camper Cards */}
      {hasCampers ? (
        <div className="space-y-4">
          {campers.map((camper) => (
            <CamperCard
              key={camper.id}
              camper={camper}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No registrations found for {year}. Head to the{" "}
              <a
                href="/registration/overview"
                className="text-primary underline"
              >
                Overview
              </a>{" "}
              page to create one.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Checkout Footer */}
      {hasReadyRegistrations && (
        <Card className="sticky bottom-4 border-2">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {selectedIds.size} registration
                {selectedIds.size !== 1 ? "s" : ""} selected
              </p>
              <p className="text-xl font-bold">
                Total: {formatPrice(totalPrice)}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={selectedIds.size === 0}
            >
              Go to Checkout
              {selectedIds.size > 0 &&
                ` (${selectedIds.size} registration${selectedIds.size !== 1 ? "s" : ""})`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
