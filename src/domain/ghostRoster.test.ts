import { describe, expect, it } from "vitest";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  GHOST_ROSTERS,
  RELEASE_SLOT,
  RELEASE_SLOT_BY_KIND,
  mintFreshSeed,
  parseRosterId,
  pickRosterId,
  rosterIdForSeed,
} from "./ghostRoster";
import { createRunRandom } from "./runRandom";

const FRONT_ARMS: GhostKindId[] = [GHOST_KIND.pinky, GHOST_KIND.wardy];
const RELIEF: GhostKindId[] = [GHOST_KIND.clyde, GHOST_KIND.spunky];

describe("GHOST_ROSTERS", () => {
  it("puts Blinky in slot 0, a front arm in slot 1 and a relief ghost in slot 3", () => {
    for (const roster of GHOST_ROSTERS) {
      expect(roster).toHaveLength(4);
      expect(roster[RELEASE_SLOT.anchor]).toBe(GHOST_KIND.blinky);
      expect(FRONT_ARMS).toContain(roster[RELEASE_SLOT.front]);
      expect(RELIEF).toContain(roster[RELEASE_SLOT.relief]);
      expect(new Set(roster).size).toBe(4);
    }
  });

  it("always pairs Blinky with a front arm, and never repeats a roster", () => {
    for (const roster of GHOST_ROSTERS) {
      expect(roster.some((kind) => FRONT_ARMS.includes(kind))).toBe(true);
    }
    expect(new Set(GHOST_ROSTERS.map((roster) => roster.join())).size).toBe(GHOST_ROSTERS.length);
  });

  it("brings every ghost into at least one roster", () => {
    const used = new Set(GHOST_ROSTERS.flat());
    for (const kind of Object.values(GHOST_KIND)) {
      expect(used.has(kind)).toBe(true);
    }
  });

  it("maps each kind to the slot it takes in the classic and LEARN setups", () => {
    expect(RELEASE_SLOT_BY_KIND[GHOST_KIND.blinky]).toBe(RELEASE_SLOT.anchor);
    expect(RELEASE_SLOT_BY_KIND[GHOST_KIND.pinky]).toBe(RELEASE_SLOT.front);
    expect(RELEASE_SLOT_BY_KIND[GHOST_KIND.inky]).toBe(RELEASE_SLOT.flank);
    expect(RELEASE_SLOT_BY_KIND[GHOST_KIND.clyde]).toBe(RELEASE_SLOT.relief);
  });
});

describe("roster rolling", () => {
  it("is deterministic per seed and uses every roster across seeds", () => {
    expect(rosterIdForSeed("abc")).toBe(rosterIdForSeed("abc"));
    expect(pickRosterId(createRunRandom("abc"))).toBe(rosterIdForSeed("abc"));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => rosterIdForSeed(`seed-${i}`)));
    expect(seen.size).toBe(GHOST_ROSTERS.length);
  });

  it("parses stored and URL roster ids strictly", () => {
    expect(parseRosterId("0")).toBe(0);
    expect(parseRosterId("5")).toBe(5);
    expect(parseRosterId("6")).toBeNull();
    expect(parseRosterId("-1")).toBeNull();
    expect(parseRosterId("2.5")).toBeNull();
    expect(parseRosterId(null)).toBeNull();
  });
});

describe("mintFreshSeed", () => {
  const seedsFor = (id: number): string[] => {
    const seeds: string[] = [];
    for (let i = 0; seeds.length < 12 && i < 2000; i += 1) {
      if (rosterIdForSeed(`mint-${i}`) === id) {
        seeds.push(`mint-${i}`);
      }
    }
    return seeds;
  };

  it("keeps the first seed when there is no previous roster or it differs", () => {
    const same = seedsFor(1)[0]!;
    expect(mintFreshSeed(null, () => same)).toBe(same);
    expect(mintFreshSeed(2, () => same)).toBe(same);
  });

  it("re-mints until the roster differs from the previous run's", () => {
    const queue = [...seedsFor(1).slice(0, 3), ...seedsFor(4).slice(0, 1)];
    const seed = mintFreshSeed(1, () => queue.shift()!);
    expect(rosterIdForSeed(seed)).toBe(4);
    expect(queue).toEqual([]);
  });

  it("gives up after a bounded number of attempts", () => {
    let calls = 0;
    const stuck = seedsFor(3)[0]!;
    expect(
      mintFreshSeed(3, () => {
        calls += 1;
        return stuck;
      }),
    ).toBe(stuck);
    expect(calls).toBe(8);
  });
});
