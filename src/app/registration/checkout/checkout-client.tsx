"use client";

import { TagIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  Discount,
  DiscountEvaluationResult,
} from "@/lib/services/discount-service";
import {
  type CheckoutCamper,
  evaluateCheckoutDiscounts,
  validateCheckoutBursaryCode,
} from "./actions";
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
  const [isPending, startTransition] = useTransition();
  const [discountResult, setDiscountResult] =
    useState<DiscountEvaluationResult | null>(null);

  const [applyAutoDiscounts, setApplyAutoDiscounts] = useState(true);
  const [bursaryCodeInput, setBursaryCodeInput] = useState("");
  const [appliedCodes, setAppliedCodes] = useState<
    Array<{ code: string; discount: Discount }>
  >([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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

  const subtotal = useMemo(
    () => selectedRegistrations.reduce((sum, r) => sum + r.price, 0),
    [selectedRegistrations],
  );

  // Evaluate discounts when selection changes
  useEffect(() => {
    if (selectedRegistrations.length === 0) {
      setDiscountResult(null);
      return;
    }

    startTransition(async () => {
      const result = await evaluateCheckoutDiscounts(
        selectedRegistrations.map((r) => ({
          id: r.id,
          camperId: r.camperId,
          price: r.price,
          numDays: r.numDays,
        })),
        appliedCodes.map((c) => c.code),
        { skipAutoApply: !applyAutoDiscounts },
      );
      setDiscountResult(result);
    });
  }, [selectedRegistrations, appliedCodes, applyAutoDiscounts]);

  const totalPrice = discountResult?.total ?? subtotal;
  const totalSavings = discountResult?.totalSavings ?? 0;

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

  const handleApplyCode = async () => {
    const code = bursaryCodeInput.trim();
    if (!code) return;

    if (appliedCodes.some((c) => c.code.toUpperCase() === code.toUpperCase())) {
      setCodeError("Code already applied");
      return;
    }

    setIsValidating(true);
    setCodeError(null);

    try {
      const result = await validateCheckoutBursaryCode(code);
      if (result.valid && result.discount) {
        setAppliedCodes((prev) => [
          ...prev,
          { code: code.toUpperCase(), discount: result.discount! },
        ]);
        setBursaryCodeInput("");
      } else {
        setCodeError(result.error ?? "Invalid code");
      }
    } catch {
      setCodeError("Failed to validate code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCode = (code: string) => {
    setAppliedCodes((prev) => prev.filter((c) => c.code !== code));
  };

  const handleCheckout = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(",");
    const params = new URLSearchParams({ ids });
    if (appliedCodes.length > 0) {
      params.set("codes", appliedCodes.map((c) => c.code).join(","));
    }
    router.push(`/registration/checkout/payment?${params.toString()}`);
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

      {/* Spacer for fixed checkout footer */}
      {hasReadyRegistrations && <div className="h-40" />}

      {/* Checkout Footer */}
      {hasReadyRegistrations && (
        <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 border-2 z-50">
          <CardContent className="py-4">
            {/* Auto-discounts toggle */}
            <div className="mb-3 flex items-center gap-2">
              <Switch
                id="auto-discounts"
                checked={applyAutoDiscounts}
                onCheckedChange={setApplyAutoDiscounts}
              />
              <Label htmlFor="auto-discounts" className="text-sm cursor-pointer">
                Apply auto discounts
              </Label>
            </div>

            {/* Bursary Code Input */}
            <div className="mb-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter bursary code"
                  value={bursaryCodeInput}
                  onChange={(e) => {
                    setBursaryCodeInput(e.target.value);
                    setCodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCode();
                    }
                  }}
                  disabled={isValidating}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleApplyCode}
                  disabled={isValidating || !bursaryCodeInput.trim()}
                  className="shrink-0"
                >
                  {isValidating ? "..." : "Apply"}
                </Button>
              </div>
              {codeError && (
                <p className="text-xs text-destructive mt-1">{codeError}</p>
              )}
              {appliedCodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {appliedCodes.map((c) => (
                    <Badge
                      key={c.code}
                      variant="secondary"
                      className="text-xs gap-1"
                    >
                      <TagIcon className="size-3" />
                      {c.discount.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveCode(c.code)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Discount badges */}
            {discountResult &&
              discountResult.applicableDiscounts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {discountResult.applicableDiscounts.map((ad) => (
                    <Badge key={ad.discount.id} variant="default">
                      <TagIcon className="size-3 mr-1" />
                      {ad.discount.name}: -{formatPrice(ad.savings)}
                    </Badge>
                  ))}
                </div>
              )}

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-muted-foreground text-sm">
                  {selectedIds.size} registration
                  {selectedIds.size !== 1 ? "s" : ""} selected
                </p>
                {totalSavings > 0 ? (
                  <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground line-through">
                      Subtotal: {formatPrice(subtotal)}
                    </p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      Total: {formatPrice(totalPrice)}{" "}
                      <span className="text-sm font-normal">
                        (You save {formatPrice(totalSavings)})
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xl font-bold">
                    Total: {formatPrice(totalPrice)}
                    {isPending && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ...
                      </span>
                    )}
                  </p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={selectedIds.size === 0}
              >
                Go to Checkout
                {selectedIds.size > 0 &&
                  ` (${selectedIds.size} registration${selectedIds.size !== 1 ? "s" : ""})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
