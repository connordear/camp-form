"use client";

import {
  CalendarIcon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Discount } from "@/lib/services/discount-service";
import {
  CONDITION_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
} from "@/lib/types/discount-schemas";
import { DiscountDialog } from "./discount-dialog";

interface DiscountsListProps {
  discounts: Discount[];
}

function formatAmount(discount: Discount): string {
  if (discount.type === "percentage") {
    return `${discount.amount}%`;
  }
  return `$${(discount.amount / 100).toFixed(2)}`;
}

function formatDeadline(date: string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DiscountCard({ discount }: { discount: Discount }) {
  const [isToggling, setIsToggling] = useState(false);
  const [isActive, setIsActive] = useState(discount.isActive);

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    setIsActive(checked);
    try {
      const { toggleDiscountActive } = await import(
        "@/app/admin/[year]/discounts/actions"
      );
      await toggleDiscountActive(discount.id);
    } catch {
      // Revert on error
      setIsActive(!checked);
    } finally {
      setIsToggling(false);
    }
  };

  const isDeadlinePassed =
    discount.conditionType === "deadline" &&
    discount.deadlineDate &&
    new Date(discount.deadlineDate) < new Date();

  return (
    <Card className={!isActive ? "opacity-60" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {discount.type === "percentage" ? (
                <PercentIcon className="size-4 text-muted-foreground" />
              ) : (
                <TagIcon className="size-4 text-muted-foreground" />
              )}
              {discount.name}
            </CardTitle>
            {discount.description && (
              <CardDescription>{discount.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label="Toggle discount active"
            />
            <DiscountDialog
              discount={discount}
              trigger={
                <Button variant="outline" size="sm">
                  <PencilIcon className="size-4 mr-1" />
                  Edit
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-sm">
            {formatAmount(discount)} {DISCOUNT_TYPE_LABELS[discount.type]}
          </Badge>
          <Badge
            variant={isDeadlinePassed ? "destructive" : "outline"}
            className="text-sm"
          >
            {discount.conditionType === "deadline" && (
              <>
                <CalendarIcon className="size-3 mr-1" />
                {CONDITION_TYPE_LABELS[discount.conditionType]}:{" "}
                {formatDeadline(discount.deadlineDate)}
                {isDeadlinePassed && " (Expired)"}
              </>
            )}
            {discount.conditionType === "sibling" && (
              <>
                <UsersIcon className="size-3 mr-1" />
                {CONDITION_TYPE_LABELS[discount.conditionType]}:{" "}
                {discount.minCampers}+ campers
              </>
            )}
          </Badge>
          {!isActive && (
            <Badge variant="secondary" className="text-sm">
              Inactive
            </Badge>
          )}
        </div>
        {discount.stripeCouponId && (
          <p className="text-xs text-muted-foreground mt-3">
            Stripe Coupon: {discount.stripeCouponId}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DiscountsList({ discounts }: DiscountsListProps) {
  const activeDiscounts = discounts.filter((d) => d.isActive);
  const inactiveDiscounts = discounts.filter((d) => !d.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Discounts</h1>
          <p className="text-muted-foreground">
            Configure automatic discounts for checkout
          </p>
        </div>
        <DiscountDialog
          trigger={
            <Button>
              <PlusIcon className="size-4 mr-2" />
              Add Discount
            </Button>
          }
        />
      </div>

      {discounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TagIcon className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No discounts configured</h3>
            <p className="text-muted-foreground mb-4">
              Create discounts to offer early bird pricing, sibling discounts,
              and more.
            </p>
            <DiscountDialog
              trigger={
                <Button>
                  <PlusIcon className="size-4 mr-2" />
                  Add Discount
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeDiscounts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Active Discounts ({activeDiscounts.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeDiscounts.map((discount) => (
                  <DiscountCard key={discount.id} discount={discount} />
                ))}
              </div>
            </div>
          )}

          {inactiveDiscounts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Inactive Discounts ({inactiveDiscounts.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {inactiveDiscounts.map((discount) => (
                  <DiscountCard key={discount.id} discount={discount} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
