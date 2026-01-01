import { PlusIcon } from "lucide-react";
import { WithTooltip } from "../hoc/with-tooltip";
import { Button } from "../ui/button";

type AddButtonProps = { onClick: () => void; tooltip?: string };

export default function AddButton({ onClick, tooltip }: AddButtonProps) {
  return (
    <WithTooltip text={tooltip}>
      <Button type="button" variant="outline" size="icon" onClick={onClick}>
        <PlusIcon />
      </Button>
    </WithTooltip>
  );
}
