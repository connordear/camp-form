import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type WithTooltipProps = {
  children: React.ReactNode;
  text?: string;
};

export function WithTooltip({ children, text }: WithTooltipProps) {
  if (!text) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
