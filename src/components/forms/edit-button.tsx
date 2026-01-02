import { EditIcon } from "lucide-react";
import { WithTooltip } from "../hoc/with-tooltip";
import { Button } from "../ui/button";

type EditButtonProps = { tooltip?: string } & React.ComponentProps<
  typeof Button
>;

export default function EditButton({ tooltip, ...props }: EditButtonProps) {
  return (
    <WithTooltip text={tooltip}>
      <Button type="button" variant="outline" size="icon" {...props}>
        <EditIcon />
      </Button>
    </WithTooltip>
  );
}
