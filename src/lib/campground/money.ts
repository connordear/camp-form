/** Format integer cents as dollars, e.g. 4500 -> "$45.00". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

/** Parse a dollar amount typed by a person into integer cents. NaN if invalid. */
export function dollarsToCents(value: string): number {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number.parseFloat(trimmed) * 100);
}
