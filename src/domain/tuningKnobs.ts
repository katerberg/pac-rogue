import type { TuningKey } from "./tuning";

export type KnobGroup =
  | "Movement"
  | "Ghost speed"
  | "Timer"
  | "Fruit"
  | "Death"
  | "Bonus"
  | "Ghost AI"
  | "Release"
  | "Scatter"
  | "Visuals";

type KnobBase = { key: TuningKey; group: KnobGroup; label: string };

export type RangeKnob = KnobBase & {
  kind: "range";
  min: number;
  max: number;
  step: number;
  unit: string;
};

export type KnobDef = RangeKnob | (KnobBase & { kind: "color" | "toggle" });

export const LEFT_KNOB_GROUPS: readonly KnobGroup[] = [
  "Movement",
  "Ghost speed",
  "Timer",
  "Fruit",
  "Death",
  "Bonus",
];

export const RIGHT_KNOB_GROUPS: readonly KnobGroup[] = [
  "Ghost AI",
  "Release",
  "Scatter",
  "Visuals",
];

function range(
  key: TuningKey,
  group: KnobGroup,
  label: string,
  min: number,
  max: number,
  step: number,
  unit = "",
): RangeKnob {
  return { key, group, label, kind: "range", min, max, step, unit };
}

export const TUNING_KNOBS: readonly KnobDef[] = [
  range("playerSpeedTiles", "Movement", "Player speed", 3, 15, 0.005, "tiles/s"),
  range("levelSpeedRamp", "Movement", "Level speed ramp", 0, 0.2, 0.005, "×/lvl"),
  range("eatDragMs", "Movement", "Eat drag", 0, 500, 5, "ms"),
  range("eatDragPeak", "Movement", "Eat drag peak", 0, 0.9, 0.01, "×"),
  range("eatDragPowerMs", "Movement", "Power eat drag", 0, 1500, 10, "ms"),
  range("preTurnPx", "Movement", "Pre-turn window", 0, 8, 1, "px"),
  range("ghostRatioStart", "Ghost speed", "Ratio at level 1", 0.3, 1.5, 0.01, "×"),
  range("ghostRatioStep", "Ghost speed", "Ratio step", 0, 0.2, 0.005, "×/lvl"),
  range("ghostRatioCap", "Ghost speed", "Ratio cap", 0.3, 1.5, 0.01, "×"),
  range("ghostTunnelRatio", "Ghost speed", "Tunnel ratio", 0.1, 1.5, 0.01, "×"),
  range("ghostHouseExitRatio", "Ghost speed", "House exit ratio", 0.1, 1.5, 0.01, "×"),
  range("elroy1Ratio", "Ghost speed", "Elroy 1 ratio", 0.5, 2, 0.0125, "×"),
  range("elroy2Ratio", "Ghost speed", "Elroy 2 ratio", 0.5, 2, 0.0125, "×"),
  range("bossGhostRatio", "Ghost speed", "Boss ghost ratio", 0.3, 2, 0.01, "×"),
  range("timerMax", "Timer", "Timer max", 10, 999, 1),
  range("timerTickMs", "Timer", "Timer tick", 10, 1000, 10, "ms"),
  range("fruitLifetimeMs", "Fruit", "Fruit lifetime", 1000, 30000, 500, "ms"),
  range("fruitThreshold1", "Fruit", "First fruit at", 1, 300, 1, "dots"),
  range("fruitThreshold2", "Fruit", "Second fruit at", 1, 300, 1, "dots"),
  range("deathHoldMs", "Death", "Death hold", 0, 5000, 5, "ms"),
  range("readyPauseMs", "Death", "Ready pause", 0, 5000, 50, "ms"),
  range("bonusStreakIdleMs", "Bonus", "Streak idle", 50, 2000, 50, "ms"),
  range("pinkyLookahead", "Ghost AI", "Pinky lookahead", 0, 8, 1, "tiles"),
  range("inkyLookahead", "Ghost AI", "Inky lookahead", 0, 8, 1, "tiles"),
  range("clydeShyTiles", "Ghost AI", "Clyde shy radius", 0, 20, 1, "tiles"),
  range("elroy1DotsLeft", "Ghost AI", "Elroy 1 dots left", 1, 100, 1, "dots"),
  range("elroy2DotsLeft", "Ghost AI", "Elroy 2 dots left", 1, 100, 1, "dots"),
  range("blinkyReleaseMs", "Release", "Blinky release", 0, 10000, 50, "ms"),
  range("pinkyReleaseMs", "Release", "Pinky release", 0, 10000, 50, "ms"),
  range("inkyReleasePellets", "Release", "Inky dots (L1)", 1, 200, 1, "dots"),
  range("clydeReleasePellets", "Release", "Clyde dots (L1)", 1, 200, 1, "dots"),
  range("level2ClydeDots", "Release", "Clyde dots (L2)", 0, 200, 1, "dots"),
  range("postLifePinkyDots", "Release", "Pinky after death", 0, 100, 1, "dots"),
  range("postLifeInkyDots", "Release", "Inky after death", 0, 100, 1, "dots"),
  range("postLifeClydeDots", "Release", "Clyde after death", 0, 100, 1, "dots"),
  range("idleReleaseMs", "Release", "Idle push (L1-4)", 500, 20000, 100, "ms"),
  range("idleReleaseLateMs", "Release", "Idle push (L5+)", 500, 20000, 100, "ms"),
  { key: "level1ChaseOnly", group: "Scatter", label: "Level 1 chase only", kind: "toggle" },
  range("scatterEarlyMs", "Scatter", "Scatter L2-4", 0, 30000, 250, "ms"),
  range("scatterLateMs", "Scatter", "Late scatter", 0, 30000, 250, "ms"),
  range("chaseMs", "Scatter", "Chase", 1000, 60000, 500, "ms"),
  range("wallThickness", "Visuals", "Wall thickness", 1, 8, 0.5, "px"),
  { key: "wallColor", group: "Visuals", label: "Wall color", kind: "color" },
  range("wallGlow", "Visuals", "Wall glow", 0, 1, 0.05),
  range("wallGlowRadius", "Visuals", "Glow radius", 0, 12, 1, "px"),
  range("wallCornerRadius", "Visuals", "Corner radius", 0, 8, 1, "px"),
  { key: "backgroundColor", group: "Visuals", label: "Background", kind: "color" },
];

function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function formatKnobValue(knob: RangeKnob, value: number): string {
  const number = value.toFixed(stepDecimals(knob.step));
  return knob.unit === "" ? number : `${number} ${knob.unit}`;
}
