import { XIcon } from "lucide-react";
import { WithTooltip } from "../hoc/with-tooltip";
import { Button } from "../ui/button";

type RemoveButtonProps = { onClick: () => void; tooltip?: string };

export default function RemoveButton({ onClick, tooltip }: RemoveButtonProps) {
  return (
    <WithTooltip text={tooltip}>
      <Button type="button" variant="outline" size="icon" onClick={onClick}>
        <XIcon />
      </Button>
    </WithTooltip>
  );
}
