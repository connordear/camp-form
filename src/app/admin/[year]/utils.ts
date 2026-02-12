export function parseYearParam(yearParam: string): number {
  const year = parseInt(yearParam, 10);
  return Number.isNaN(year) ? new Date().getFullYear() : year;
}
