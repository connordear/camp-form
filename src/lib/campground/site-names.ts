// Every 15-digit number is far enough below 2^53 to count up from exactly.
const MAX_COUNTER_DIGITS = 15;

/**
 * Name for a duplicated site.
 * - Ends in a number ("Site 1"): the next number not already taken ("Site 2").
 *   Zero padding is kept ("Site 09" -> "Site 10", "Site 01" -> "Site 02").
 * - Otherwise: "<name> (copy)", then "(copy 2)", "(copy 3)" if taken.
 * Names are compared ignoring case and surrounding spaces.
 */
export function duplicateSiteName(
  name: string,
  existingNames: string[],
): string {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const isFree = (candidate: string) => !taken.has(candidate.toLowerCase());
  const trimmed = name.trim();

  const match = /^(.*?)(\d+)$/.exec(trimmed);
  // Past 2^53 adding 1 no longer changes a Number, so a longer number is
  // treated as part of the name and gets "(copy)" instead.
  if (match && match[2].length <= MAX_COUNTER_DIGITS) {
    const [, prefix, digits] = match;
    let n = Number(digits);
    let candidate: string;
    do {
      n += 1;
      candidate = `${prefix}${String(n).padStart(digits.length, "0")}`;
    } while (!isFree(candidate));
    return candidate;
  }

  let candidate = `${trimmed} (copy)`;
  for (let i = 2; !isFree(candidate); i++) {
    candidate = `${trimmed} (copy ${i})`;
  }
  return candidate;
}
