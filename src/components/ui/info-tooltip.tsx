import type { TooltipContentProps } from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type InfoTooltipProps = {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
  side?: TooltipContentProps["side"];
};

export function InfoTooltip({
  children,
  className,
  iconClassName,
  side = "right",
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className={cn(
            "inline h-4 w-4 ml-1 text-muted-foreground cursor-help",
            iconClassName,
          )}
        />
      </TooltipTrigger>
      <TooltipContent className={cn("max-w-sm", className)} side={side}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
