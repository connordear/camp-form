import { describe, expect, test } from "bun:test";
import { cropToPoints, FULL_CROP } from "./map-layout";

describe("cropToPoints", () => {
  test("no points shows the whole drawing", () => {
    expect(cropToPoints([])).toEqual(FULL_CROP);
  });

  test("pads around the points", () => {
    const crop = cropToPoints(
      [
        { x: 50, y: 30 },
        { x: 80, y: 80 },
      ],
      { padX: 5, padY: 5 },
    );
    expect(crop).toEqual({ x: 45, y: 25, width: 40, height: 60 });
  });

  test("a single point gets the minimum size, centred on it", () => {
    const crop = cropToPoints([{ x: 50, y: 50 }], {
      minWidth: 30,
      minHeight: 40,
    });
    expect(crop).toEqual({ x: 35, y: 30, width: 30, height: 40 });
  });

  test("slides back inside the drawing instead of shrinking", () => {
    const crop = cropToPoints([{ x: 98, y: 2 }], {
      minWidth: 30,
      minHeight: 40,
    });
    expect(crop).toEqual({ x: 70, y: 0, width: 30, height: 40 });
  });

  test("never larger than the drawing", () => {
    const crop = cropToPoints([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(crop).toEqual(FULL_CROP);
  });
});
