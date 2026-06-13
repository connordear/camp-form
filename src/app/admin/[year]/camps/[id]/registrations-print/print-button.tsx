"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  count: number;
}

export function PrintButton({ count }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
    >
      <Printer className="size-4" />
      Print All ({count})
    </button>
  );
}
