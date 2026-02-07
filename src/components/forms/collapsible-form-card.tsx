"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

type CollapsibleFormCardProps = {
  /** Title displayed in the card header */
  title: string;
  /** Status badge component (e.g., form.StatusBadge or StaticFormStatusBadge) */
  statusBadge: ReactNode;
  /** Whether the form section is complete - triggers auto-collapse when transitioning to true */
  isComplete: boolean;
  /** Card content (CardContent and CardFooter) */
  children: ReactNode;
  /** Additional className for the Card */
  className?: string;
  /** Max width class, defaults to max-w-xl */
  maxWidth?: string;
};

/**
 * A Card component that can collapse when the form section is complete.
 *
 * Behavior:
 * - Starts expanded (even if already complete, so users can review)
 * - Auto-collapses when isComplete transitions from false to true (after a save)
 * - Users can manually toggle expand/collapse at any time
 * - When collapsed, shows only the header with title and status badge
 */
export function CollapsibleFormCard({
  title,
  statusBadge,
  isComplete,
  children,
  className,
  maxWidth = "max-w-xl",
}: CollapsibleFormCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const prevIsCompleteRef = useRef(isComplete);

  // Auto-collapse when isComplete transitions from false to true
  useEffect(() => {
    if (!prevIsCompleteRef.current && isComplete) {
      setIsOpen(false);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card className={cn("w-full", maxWidth, className)}>
        <CardHeader>
          <div className="flex gap-3 justify-between items-center">
            <CardTitle className="truncate">{title}</CardTitle>
            <div className="flex items-center gap-2">
              {statusBadge}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={isOpen ? "Collapse section" : "Expand section"}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
