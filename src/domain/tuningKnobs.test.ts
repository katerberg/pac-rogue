import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING, type TuningKey } from "./tuning";
import {
  formatKnobValue,
  KNOB_HELP,
  LEFT_KNOB_GROUPS,
  RIGHT_KNOB_GROUPS,
  TUNING_KNOBS,
  VISUALS_SUBGROUPS,
  type RangeKnob,
  type VisualsSubgroup,
} from "./tuningKnobs";

describe("TUNING_KNOBS", () => {
  it("has exactly one knob per tuning key", () => {
    const keys = TUNING_KNOBS.map((knob) => knob.key).sort();
    expect(keys).toEqual((Object.keys(DEFAULT_TUNING) as TuningKey[]).sort());
  });

  it("puts every default inside its range and every group on a panel", () => {
    const groups = new Set([...LEFT_KNOB_GROUPS, ...RIGHT_KNOB_GROUPS]);
    for (const knob of TUNING_KNOBS) {
      expect(groups.has(knob.group), knob.key).toBe(true);
      const value = DEFAULT_TUNING[knob.key];
      if (knob.kind === "range") {
        expect(value, knob.key).toBeGreaterThanOrEqual(knob.min);
        expect(value, knob.key).toBeLessThanOrEqual(knob.max);
      } else {
        expect(typeof value, knob.key).toBe(knob.kind === "toggle" ? "boolean" : "number");
      }
    }
  });

  it("puts every Visuals knob in a known subgroup and nowhere else uses subgroups", () => {
    const allowed = new Set<VisualsSubgroup>(VISUALS_SUBGROUPS);
    for (const knob of TUNING_KNOBS) {
      if (knob.group === "Visuals") {
        expect(knob.subgroup, knob.key).toBeDefined();
        expect(allowed.has(knob.subgroup as VisualsSubgroup), knob.key).toBe(true);
      } else {
        expect(knob.subgroup, knob.key).toBeUndefined();
      }
    }
    for (const subgroup of VISUALS_SUBGROUPS) {
      expect(
        TUNING_KNOBS.some((k) => k.group === "Visuals" && k.subgroup === subgroup),
        subgroup,
      ).toBe(true);
    }
  });

  it("keeps Dots extreme maxes under the Visuals Dots subgroup", () => {
    expect(VISUALS_SUBGROUPS).toContain("Dots");
    expect(RIGHT_KNOB_GROUPS).toEqual(["Visuals"]);
    expect(LEFT_KNOB_GROUPS).toEqual([
      "Movement",
      "Ghost speed",
      "Timer",
      "Fruit",
      "Death",
      "Bonus",
      "Boss",
      "Ghost AI",
      "Release",
      "Scatter",
    ]);
    const dotsMax: Partial<Record<TuningKey, number>> = {
      pelletRadius: 48,
      pelletStrokeWidth: 32,
      pelletGlow: 36,
      pelletGlowRadius: 120,
      powerPelletRadius: 48,
      powerPelletStrokeWidth: 32,
      powerPelletGlow: 36,
      powerPelletGlowRadius: 120,
      bossPelletRadius: 48,
      bossPelletStrokeWidth: 32,
      bossPelletGlow: 36,
      bossPelletGlowRadius: 120,
      optionalPelletRadius: 48,
      optionalPelletStrokeWidth: 32,
      optionalPelletGlow: 36,
      optionalPelletGlowRadius: 120,
    };
    for (const knob of TUNING_KNOBS) {
      if (knob.subgroup === "Dots") {
        expect(knob.group, knob.key).toBe("Visuals");
      }
      const max = dotsMax[knob.key];
      if (max === undefined || knob.kind !== "range") {
        continue;
      }
      expect(knob.subgroup, knob.key).toBe("Dots");
      expect(knob.max, knob.key).toBe(max);
    }
  });
});

describe("KNOB_HELP", () => {
  it("explains every knob in more words than its label", () => {
    for (const knob of TUNING_KNOBS) {
      expect(KNOB_HELP[knob.key].length, knob.key).toBeGreaterThan(knob.label.length + 10);
    }
  });
});

describe("formatKnobValue", () => {
  it("uses the step's decimals and the unit", () => {
    const knob = TUNING_KNOBS.find((k) => k.key === "playerSpeedTiles") as RangeKnob;
    expect(formatKnobValue(knob, 7.315)).toBe("7.315 tiles/s");
    const timer = TUNING_KNOBS.find((k) => k.key === "timerMax") as RangeKnob;
    expect(formatKnobValue(timer, 999)).toBe("999");
  });
});
