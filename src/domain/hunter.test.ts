import { describe, expect, it } from "vitest";
import { EXPIRY_URGENCY_MS } from "./expiryBlink";
import { GHOST_DIR } from "./ghostPath";
import {
  HUNTER_FRIGHTENED_MIN_MS,
  HUNTER_FRIGHTENED_MS,
  hunterEatCharge,
  hunterFrightenLimit,
  hunterFrightenedMs,
  pickFrightenTargets,
  pickFrightenedDirection,
  showsFrightenedLook,
} from "./hunter";

describe("hunterFrightenedMs", () => {
  it("shortens by 500ms a level from 6s, never below 4s", () => {
    const byLevel = [1, 2, 3, 4, 5, 6, 9].map((level) =>
      hunterFrightenedMs(HUNTER_FRIGHTENED_MS, true, level),
    );
    expect(byLevel).toEqual([6000, 5500, 5000, 4500, 4000, 4000, 4000]);
    expect(Math.min(...byLevel)).toBe(HUNTER_FRIGHTENED_MIN_MS);
  });

  it("stays flat when the form does not shorten", () => {
    expect(hunterFrightenedMs(HUNTER_FRIGHTENED_MS, false, 9)).toBe(6000);
  });
});

describe("hunterEatCharge", () => {
  it("doubles per ghost so the third fills a whole bar", () => {
    expect([0, 1, 2, 3].map(hunterEatCharge)).toEqual([75, 150, 300, 600]);
  });
});

describe("pickFrightenTargets", () => {
  const ghosts = [
    { eid: 5, x: 50, y: 0 },
    { eid: 1, x: 10, y: 0 },
    { eid: 3, x: 30, y: 0 },
    { eid: 2, x: 10, y: 0 },
    { eid: 4, x: 40, y: 0 },
  ];

  it("takes every ghost with no limit", () => {
    expect(pickFrightenTargets(ghosts, { x: 0, y: 0 }, null)).toHaveLength(5);
  });

  it("takes the closest ghosts up to the limit, lowest eid on ties", () => {
    expect(pickFrightenTargets(ghosts, { x: 0, y: 0 }, 4)).toEqual([1, 2, 3, 4]);
  });

  it("limits only the Blinky Swarm boss, to 4", () => {
    expect(hunterFrightenLimit("blinkySwarm")).toBe(4);
    expect(hunterFrightenLimit("chainedGhosts")).toBeNull();
    expect(hunterFrightenLimit(null)).toBeNull();
  });
});

describe("pickFrightenedDirection", () => {
  const opens = [GHOST_DIR.up, GHOST_DIR.left, GHOST_DIR.right];

  it("picks among the open directions that do not turn back", () => {
    expect(pickFrightenedDirection(opens, GHOST_DIR.right, () => 0)).toBe(GHOST_DIR.up);
    expect(pickFrightenedDirection(opens, GHOST_DIR.right, () => 0.99)).toBe(GHOST_DIR.right);
  });

  it("turns back only in a dead end", () => {
    expect(pickFrightenedDirection([GHOST_DIR.left], GHOST_DIR.right, () => 0.5)).toBe(
      GHOST_DIR.left,
    );
    expect(pickFrightenedDirection([], GHOST_DIR.right, () => 0.5)).toBe(GHOST_DIR.none);
  });
});

describe("showsFrightenedLook", () => {
  it("shows the frightened ghosts solid, then blinks them in the last second", () => {
    const frightened = { eids: [7], remainingMs: 3000 };
    expect(showsFrightenedLook(frightened, 7, 150)).toBe(true);
    expect(showsFrightenedLook(frightened, 8, 0)).toBe(false);
    const ending = { eids: [7], remainingMs: EXPIRY_URGENCY_MS - 1 };
    expect(showsFrightenedLook(ending, 7, 0)).toBe(true);
    expect(showsFrightenedLook(ending, 7, 150)).toBe(false);
    expect(showsFrightenedLook(null, 7, 0)).toBe(false);
  });
});
