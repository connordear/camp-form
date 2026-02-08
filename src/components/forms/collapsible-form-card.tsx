"use client";

import { ChevronDown } from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

export type CollapsibleFormCardRef = {
  /** Expand the card if it's collapsed */
  expand: () => void;
  /** Scroll the card into view */
  scrollIntoView: () => void;
};

type CollapsibleFormCardProps = {
  /** Title displayed in the card header */
  title: string;
  /** Status badge component (e.g., form.StatusBadge or StaticFormStatusBadge) */
  statusBadge: ReactNode;
  /** Whether the form section is complete - triggers auto-collapse when transitioning to true */
  isComplete: boolean;
  /** Whether the form has been interacted with (sticky - stays true even if changes are reverted) */
  isDirty?: boolean;
  /** Card content (CardContent and CardFooter) */
  children: ReactNode;
  /** Additional className for the Card */
  className?: string;
  /** Max width class, defaults to max-w-xl */
  maxWidth?: string;
  /** Ref to expose expand and scrollIntoView methods */
  ref?: Ref<CollapsibleFormCardRef>;
};

/**
 * A Card component that can collapse when the form section is complete.
 *
 * Behavior:
 * - Starts collapsed if already complete, expanded otherwise
 * - Auto-collapses when isComplete transitions from false to true (after a save),
 *   but only if the form hasn't been touched (isDirty is false)
 * - Users can manually toggle expand/collapse at any time
 * - When collapsed, shows only the header with title and status badge
 *
 * Exposes methods via ref:
 * - expand(): Expand the card if collapsed
 * - scrollIntoView(): Scroll the card into view
 */
export function CollapsibleFormCard({
  title,
  statusBadge,
  isComplete,
  isDirty,
  children,
  className,
  maxWidth = "max-w-xl",
  ref,
}: CollapsibleFormCardProps) {
  const [isOpen, setIsOpen] = useState(!isComplete);
  const prevIsCompleteRef = useRef(isComplete);
  const cardElementRef = useRef<HTMLDivElement>(null);

  // Expose expand and scrollIntoView methods via ref
  useImperativeHandle(ref, () => ({
    expand: () => setIsOpen(true),
    scrollIntoView: () =>
      cardElementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
  }));

  // Auto-collapse when isComplete transitions from false to true,
  // but only if the form hasn't been touched yet
  useEffect(() => {
    if (!prevIsCompleteRef.current && isComplete && !isDirty) {
      setIsOpen(false);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete, isDirty]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card ref={cardElementRef} className={cn("w-full", maxWidth, className)}>
        <CardHeader>
          <div className="flex gap-3 justify-between items-center min-w-0">
            <CardTitle className="min-w-0 truncate">{title}</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
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
