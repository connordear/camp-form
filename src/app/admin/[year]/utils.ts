/** Falls back to the current year when the param is missing (e.g. on /admin/campground). */
export function parseYearParam(yearParam: string | undefined): number {
  if (!yearParam) return new Date().getFullYear();
  const year = parseInt(yearParam, 10);
  return Number.isNaN(year) ? new Date().getFullYear() : year;
}
