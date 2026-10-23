import { describe, expect, it } from "vitest";
import {
  TRINKET_LAYER_OFFSET,
  TRINKET_POOL_COLUMNS,
  trinketPoolLayout,
  upgradeHudTextAnchor,
  UPGRADE_HUD_COLUMNS,
  UPGRADE_HUD_COMPACT_SIZE,
  UPGRADE_HUD_GAP,
  UPGRADE_HUD_HOVER_SCALE,
  UPGRADE_HUD_RIGHT_PAD,
  upgradeHudIconPosition,
  upgradeHudIconSize,
} from "./upgradeHud";

describe("upgradeHudIconSize", () => {
  it("fits three icons and their gaps between the left margin and the maze", () => {
    const size = upgradeHudIconSize(200);
    const gaps = UPGRADE_HUD_GAP * 2;
    expect(12 + size * 3 + gaps).toBeLessThanOrEqual(200 - UPGRADE_HUD_RIGHT_PAD);
    expect(12 + (size + 1) * 3 + gaps).toBeGreaterThan(200 - UPGRADE_HUD_RIGHT_PAD);
  });

  it("leaves space between hovered neighbours and between the last column and the maze", () => {
    const gutter = 200;
    const size = upgradeHudIconSize(gutter);
    const grow = (size * (UPGRADE_HUD_HOVER_SCALE - 1)) / 2;
    const [a, b, c] = [0, 1, 2].map((i) => upgradeHudIconPosition(i, size, 10));
    expect(b!.x - a!.x - size - grow * 2).toBeGreaterThanOrEqual(4);
    expect(gutter - (c!.x + size / 2 + grow)).toBeGreaterThanOrEqual(8);
    const below = upgradeHudIconPosition(3, size, 10);
    expect(below.y - a!.y - size - grow * 2).toBeGreaterThanOrEqual(4);
  });

  it("never shrinks below the compact size", () => {
    expect(upgradeHudIconSize(40)).toBe(UPGRADE_HUD_COMPACT_SIZE);
  });
});

describe("upgradeHudIconPosition", () => {
  it("starts right below the quarters row", () => {
    expect(upgradeHudIconPosition(0, 16, 10)).toEqual({ x: 20, y: 42 });
  });

  it("fills three per row, left to right", () => {
    const xs = [0, 1, 2].map((i) => upgradeHudIconPosition(i, 16, 10).x);
    expect(xs).toEqual([20, 48, 76]);
    expect(upgradeHudIconPosition(UPGRADE_HUD_COLUMNS - 1, 16, 10).y).toBe(
      upgradeHudIconPosition(0, 16, 10).y,
    );
  });

  it("wraps to a new row after three, stacking downward by the icon size plus gap", () => {
    const first = upgradeHudIconPosition(0, 40, 10);
    const fourth = upgradeHudIconPosition(3, 40, 10);
    expect(fourth.x).toBe(first.x);
    expect(fourth.y).toBe(first.y + 40 + UPGRADE_HUD_GAP);
  });

  it("honors a shifted left edge", () => {
    expect(upgradeHudIconPosition(0, 16, 10, 84).x).toBe(92);
  });
});

describe("trinketPoolLayout", () => {
  const ICON = 40;

  it("draws half-size cards below two slot rows", () => {
    const [card] = trinketPoolLayout([{ id: "a", copies: 1 }], 6, ICON, 16);
    const secondRow = upgradeHudIconPosition(3, ICON, 16);
    expect(card!.size).toBe(ICON / 2);
    expect(card!.y - card!.size / 2).toBeGreaterThan(secondRow.y + ICON / 2);
    expect(card!.x - card!.size / 2).toBe(upgradeHudIconPosition(0, ICON, 16).x - ICON / 2);
  });

  it("drops below every slot row past six", () => {
    const six = trinketPoolLayout([{ id: "a", copies: 1 }], 6, ICON, 16)[0]!;
    const seven = trinketPoolLayout([{ id: "a", copies: 1 }], 7, ICON, 16)[0]!;
    expect(seven.y).toBeGreaterThan(six.y);
  });

  it("layers up to three copies like paper and starts a new stack at the fourth", () => {
    const cards = trinketPoolLayout([{ id: "a", copies: 4 }], 6, ICON, 16);
    expect(cards.map(({ stack, layer }) => [stack, layer])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
    ]);
    expect(cards[1]!.x - cards[0]!.x).toBe(TRINKET_LAYER_OFFSET);
    expect(cards[1]!.y - cards[0]!.y).toBe(TRINKET_LAYER_OFFSET);
    expect(cards[3]!.x).toBeGreaterThan(cards[2]!.x);
  });

  it("fits six stacks in the width of three icons, then wraps", () => {
    const kinds = Array.from({ length: TRINKET_POOL_COLUMNS + 1 }, (_, i) => ({
      id: `k${i}`,
      copies: 1,
    }));
    const cards = trinketPoolLayout(kinds, 6, ICON, 16);
    const rowEnd = cards[TRINKET_POOL_COLUMNS - 1]!;
    const lastIcon = upgradeHudIconPosition(2, ICON, 16);
    expect(rowEnd.x + rowEnd.size / 2).toBeLessThanOrEqual(lastIcon.x + ICON / 2);
    expect(cards[TRINKET_POOL_COLUMNS]!.x).toBe(cards[0]!.x);
    expect(cards[TRINKET_POOL_COLUMNS]!.y).toBeGreaterThan(cards[0]!.y);
  });
});

describe("upgradeHudTextAnchor", () => {
  it("centers on the middle grid column under the lowest box", () => {
    const middle = upgradeHudIconPosition(1, 40, 16);
    const low = { x: 10, y: 300, size: 20 };
    expect(upgradeHudTextAnchor([low], 40, 16)).toEqual({ x: middle.x, y: 330 });
  });

  it("sits under the first row when nothing is owned", () => {
    const middle = upgradeHudIconPosition(1, 40, 16);
    expect(upgradeHudTextAnchor([], 40, 16)).toEqual({ x: middle.x, y: middle.y + 40 });
  });
});
