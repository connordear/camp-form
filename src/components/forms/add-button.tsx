import { PlusIcon } from "lucide-react";
import { WithTooltip } from "../hoc/with-tooltip";
import { Button } from "../ui/button";

type AddButtonProps = { tooltip?: string } & React.ComponentProps<
  typeof Button
>;

export default function AddButton({ tooltip, ...props }: AddButtonProps) {
  return (
    <WithTooltip text={tooltip}>
      <Button type="button" variant="outline" size="icon" {...props}>
        <PlusIcon />
      </Button>
    </WithTooltip>
  );
}
