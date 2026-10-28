/**
 * pickNearest is the fluid hover rule as one pure function: the item the
 * pointer is inside wins; otherwise the nearest center does; ties keep the
 * first item. The hook runs it once per frame and the docs page times it.
 */
import { describe, expect, it } from "vitest";
import { pickNearest, type PickNearestInput } from "./fluid-hover";

// Five 36px rows in a 4px-gap column inside 8px padding, in a container
// whose bounding rect starts at (100, 200) in the viewport.
const rows = Array.from({ length: 5 }, (_, i) => ({
  top: 8 + i * 40,
  left: 8,
  width: 240,
  height: 36,
}));

const base: Omit<PickNearestInput, "point"> = {
  axis: "y",
  rects: rows,
  containerRect: { left: 100, top: 200, width: 256, height: 212 },
  scroll: { x: 0, y: 0 },
  border: { x: 0, y: 0 },
  layoutSize: { width: 256, height: 212 },
};

const at = (y: number, extra: Partial<PickNearestInput> = {}) =>
  pickNearest({ ...base, point: { x: 150, y: 200 + y }, ...extra });

describe("pickNearest, axis y", () => {
  it("the row the pointer is inside wins", () => {
    expect(at(8 + 40 * 2 + 10)).toBe(2);
  });

  it("a gap goes to the nearer center", () => {
    // Gap between row 1 (center 66) and row 2 (center 106): 1px past halfway.
    expect(at(87)).toBe(2);
    expect(at(85)).toBe(1);
  });

  it("padding above the first row and below the last still land", () => {
    expect(at(2)).toBe(0);
    expect(at(210)).toBe(4);
  });

  it("an exact tie keeps the first row", () => {
    expect(at(86)).toBe(1);
  });

  it("scroll offset maps layout rects into the viewport", () => {
    // Scrolled down one row: the pointer at the top of the frame is over row 1.
    expect(at(8 + 10, { scroll: { x: 0, y: 40 } })).toBe(1);
  });

  it("a scaled container (popup mid scale-in) is factored out", () => {
    // Visual height is half the layout height: layout y 98 (inside row 2)
    // shows at 49, so a pointer at 49 must still pick row 2.
    expect(
      at(49, {
        containerRect: { left: 100, top: 200, width: 256, height: 106 },
        layoutSize: { width: 256, height: 212 },
      })
    ).toBe(2);
  });

  it("a disabled row is skipped, and the next nearest wins", () => {
    expect(at(8 + 40 * 2 + 10, { isDisabled: (i) => i === 2 })).toBe(1);
  });

  it("no rects, no pick", () => {
    expect(at(50, { rects: [] })).toBeNull();
  });
});

describe("pickNearest, axis xy", () => {
  // A 2 x 2 grid of 100px tiles with a 20px gap.
  const tiles = [
    { top: 0, left: 0, width: 100, height: 100 },
    { top: 0, left: 120, width: 100, height: 100 },
    { top: 120, left: 0, width: 100, height: 100 },
    { top: 120, left: 120, width: 100, height: 100 },
  ];
  const grid: Omit<PickNearestInput, "point"> = {
    ...base,
    axis: "xy",
    rects: tiles,
    containerRect: { left: 0, top: 0, width: 220, height: 220 },
    layoutSize: { width: 220, height: 220 },
  };

  it("inside a tile wins", () => {
    expect(pickNearest({ ...grid, point: { x: 130, y: 130 } })).toBe(3);
  });

  it("the gap picks the nearest center across both axes", () => {
    // Just below-right of the crossing: tile 3's center (170,170) is nearest.
    expect(pickNearest({ ...grid, point: { x: 112, y: 112 } })).toBe(3);
    // Just above-left of it: tile 0's center (50,50) is nearest.
    expect(pickNearest({ ...grid, point: { x: 108, y: 108 } })).toBe(0);
  });
});
