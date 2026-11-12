"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveAdminNotes } from "../../actions";

/** Notes only admins see, such as how a phone booking was paid. */
export function AdminNotesForm({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: string | null;
}) {
  const [saved, setSaved] = useState(initial ?? "");
  const [value, setValue] = useState(saved);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveAdminNotes({ bookingId, adminNotes: value });
          if (result.ok) {
            setSaved(value);
            toast.success("Notes saved");
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <label htmlFor="adminNotes" className="sr-only">
        Office notes
      </label>
      <Textarea
        id="adminNotes"
        rows={3}
        maxLength={1000}
        placeholder="Only admins see these"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || value === saved}
      >
        {pending ? "Saving..." : "Save notes"}
      </Button>
    </form>
  );
}
