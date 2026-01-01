import { XIcon } from "lucide-react";
import { WithTooltip } from "../hoc/with-tooltip";
import { Button } from "../ui/button";

type RemoveButtonProps = { tooltip?: string } & React.ComponentProps<
  typeof Button
>;

export default function RemoveButton({ tooltip, ...props }: RemoveButtonProps) {
  return (
    <WithTooltip text={tooltip}>
      <Button type="button" variant="outline" size="icon" {...props}>
        <XIcon />
      </Button>
    </WithTooltip>
  );
}
