// Pure geometry for the site map: no DOM, no React. Unit tested.

/** A rectangle in percent of the whole drawing. */
export type Crop = { x: number; y: number; width: number; height: number };

export const FULL_CROP: Crop = { x: 0, y: 0, width: 100, height: 100 };

type Point = { x: number; y: number };

/**
 * The part of the drawing that holds the given markers, with some margin, so
 * the markers can be drawn large without sideways scrolling. Never smaller
 * than `minWidth` by `minHeight`, and never past the edges of the drawing.
 */
export function cropToPoints(
  points: Point[],
  { padX = 7, padY = 9, minWidth = 30, minHeight = 40 } = {},
): Crop {
  if (points.length === 0) return FULL_CROP;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const span = (lo: number, hi: number, pad: number, min: number) => {
    let start = lo - pad;
    let end = hi + pad;
    if (end - start < min) {
      const mid = (lo + hi) / 2;
      start = mid - min / 2;
      end = mid + min / 2;
    }
    // Slide back inside the drawing rather than shrinking.
    if (start < 0) [start, end] = [0, end - start];
    if (end > 100) [start, end] = [start - (end - 100), 100];
    start = Math.max(0, start);
    return [start, Math.min(100, end) - start] as const;
  };
  const [x, width] = span(Math.min(...xs), Math.max(...xs), padX, minWidth);
  const [y, height] = span(Math.min(...ys), Math.max(...ys), padY, minHeight);
  return { x, y, width, height };
}
