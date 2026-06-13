"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
    >
      <Printer className="size-4 inline mr-1" />
      Print
    </button>
  );
}