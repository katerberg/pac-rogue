import type { TuningKey } from "./tuning";

export type KnobGroup =
  | "Movement"
  | "Ghost speed"
  | "Timer"
  | "Fruit"
  | "Death"
  | "Bonus"
  | "Boss"
  | "Ghost AI"
  | "Release"
  | "Scatter"
  | "Visuals";

export type VisualsSubgroup = "Walls" | "Dot-Man" | "Charms" | "Background";

export const VISUALS_SUBGROUPS: readonly VisualsSubgroup[] = [
  "Walls",
  "Dot-Man",
  "Charms",
  "Background",
];

type KnobBase = {
  key: TuningKey;
  group: KnobGroup;
  label: string;
  subgroup?: VisualsSubgroup;
};

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
  "Boss",
  "Ghost AI",
  "Release",
  "Scatter",
];

export const RIGHT_KNOB_GROUPS: readonly KnobGroup[] = ["Visuals"];

function range(
  key: TuningKey,
  group: KnobGroup,
  label: string,
  min: number,
  max: number,
  step: number,
  unit = "",
  subgroup?: VisualsSubgroup,
): RangeKnob {
  return { key, group, label, kind: "range", min, max, step, unit, subgroup };
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
  range("bossSwarmStartGhosts", "Boss", "Swarm start Blinkys", 2, 8, 1),
  range("pinkyLookahead", "Ghost AI", "Pinky lookahead", 0, 8, 1, "tiles"),
  range("inkyLookahead", "Ghost AI", "Inky lookahead", 0, 8, 1, "tiles"),
  range("clydeShyTiles", "Ghost AI", "Clyde shy radius", 0, 20, 1, "tiles"),
  range("elroy1DotsLeft", "Ghost AI", "Elroy 1 dots left", 1, 100, 1, "dots"),
  range("elroy2DotsLeft", "Ghost AI", "Elroy 2 dots left", 1, 100, 1, "dots"),
  range("anchorReleaseMs", "Release", "Anchor release", 0, 10000, 50, "ms"),
  range("frontReleaseMs", "Release", "Front-arm release", 0, 10000, 50, "ms"),
  range("flankReleasePellets", "Release", "Flank dots (L1)", 1, 200, 1, "dots"),
  range("reliefReleasePellets", "Release", "Relief dots (L1)", 1, 200, 1, "dots"),
  range("level2ReliefDots", "Release", "Relief dots (L2)", 0, 200, 1, "dots"),
  range("postLifeFrontDots", "Release", "Front arm after death", 0, 100, 1, "dots"),
  range("postLifeFlankDots", "Release", "Flank after death", 0, 100, 1, "dots"),
  range("postLifeReliefDots", "Release", "Relief after death", 0, 100, 1, "dots"),
  range("idleReleaseMs", "Release", "Idle push (L1-4)", 500, 20000, 100, "ms"),
  range("idleReleaseLateMs", "Release", "Idle push (L5+)", 500, 20000, 100, "ms"),
  { key: "level1ChaseOnly", group: "Scatter", label: "Level 1 chase only", kind: "toggle" },
  range("scatterEarlyMs", "Scatter", "Scatter L2-4", 0, 30000, 250, "ms"),
  range("scatterLateMs", "Scatter", "Late scatter", 0, 30000, 250, "ms"),
  range("chaseMs", "Scatter", "Chase", 1000, 60000, 500, "ms"),
  range("wallThickness", "Visuals", "Wall thickness", 1, 24, 0.5, "px", "Walls"),
  { key: "wallColor", group: "Visuals", label: "Wall color", kind: "color", subgroup: "Walls" },
  range("wallCornerRadius", "Visuals", "Corner radius", 0, 24, 1, "px", "Walls"),
  range("dotManChompSpeed", "Visuals", "Dot-Man chomp", 0.25, 8, 0.25, "×", "Dot-Man"),
  { key: "charmTail", group: "Visuals", label: "Charm tail", kind: "toggle", subgroup: "Charms" },
  range("charmSize", "Visuals", "Charm size", 4, 24, 0.5, "px", "Charms"),
  range("charmSpacing", "Visuals", "Charm spacing", 0.3, 1.6, 0.05, "× size", "Charms"),
  range("charmAnchorBack", "Visuals", "Hook distance", 0, 30, 0.5, "px", "Charms"),
  range("charmWallRadius", "Visuals", "Wall radius", 0.1, 0.7, 0.05, "× size", "Charms"),
  range("charmSpring", "Visuals", "Chain spring", 0.1, 4, 0.05, "×", "Charms"),
  range("charmDamping", "Visuals", "Chain damping", 0.1, 4, 0.05, "×", "Charms"),
  range("charmMinStretch", "Visuals", "Min stretch", 0.2, 1.2, 0.05, "× link", "Charms"),
  range("charmMaxStretch", "Visuals", "Max stretch", 1, 2.5, 0.05, "× link", "Charms"),
  range("charmBounce", "Visuals", "Wall bounce", 0, 1, 0.05, "×", "Charms"),
  range("charmBobble", "Visuals", "Bobble", 0, 0.6, 0.01, "× link", "Charms"),
  range("charmBobblePeriodMs", "Visuals", "Bobble period", 200, 2000, 50, "ms", "Charms"),
  range("charmBaseAlpha", "Visuals", "Charm opacity", 0.2, 1, 0.05, "", "Charms"),
  range("charmGlowAlpha", "Visuals", "Enhanced glow", 0, 1, 0.01, "", "Charms"),
  range("charmGlowScale", "Visuals", "Glow size", 1, 3, 0.05, "× size", "Charms"),
  {
    key: "backgroundColor",
    group: "Visuals",
    label: "Background",
    kind: "color",
    subgroup: "Background",
  },
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

export const KNOB_HELP: Record<TuningKey, string> = {
  playerSpeedTiles:
    "Maze-Man's base speed in tiles per second at level 1, before the level ramp, upgrades and eat drag.",
  levelSpeedRamp:
    "Extra speed per level for Maze-Man and ghosts: speed × (1 + ramp × (level − 1)). 0.05 = +5% per level.",
  eatDragMs:
    "How long Maze-Man slows down after eating a dot. The slowdown starts at the peak and eases back to full speed over this time.",
  eatDragPeak:
    "Fraction of speed lost right after eating a dot (0.25 = 25% slower), easing back to full speed over the eat drag time.",
  eatDragPowerMs:
    "Eat drag time after eating a power pellet; the slowdown holds near its peak for this long.",
  preTurnPx:
    "How many pixels before or after a junction centre Maze-Man can start a turn and cut the corner. 0 = turn only at the exact centre.",
  ghostRatioStart:
    "Ghost speed at level 1 as a fraction of Maze-Man's speed (0.8 = ghosts 20% slower).",
  ghostRatioStep: "How much the ghost speed ratio grows each level until it reaches the cap.",
  ghostRatioCap:
    "Highest ghost speed ratio the per-level growth can reach (1.0 = parity with Maze-Man; default 1.1 lets ghosts edge past parity by level 7–8).",
  ghostTunnelRatio:
    "Ghost speed inside side tunnels as a fraction of Maze-Man's base speed (the level ramp and upgrades still multiply it).",
  ghostHouseExitRatio:
    "Speed of every ghost but the anchor (Blinky) while leaving the ghost house, as a fraction of Maze-Man's base speed.",
  elroy1Ratio:
    "Blinky's \"Cruise Elroy\" speed once few dots remain (first tier), as a fraction of Maze-Man's base speed.",
  elroy2Ratio:
    "Blinky's second, faster Elroy speed once even fewer dots remain, as a fraction of Maze-Man's base speed.",
  bossGhostRatio: "Speed of the level-9 boss ghosts as a fraction of Maze-Man's base speed.",
  bossSwarmStartGhosts:
    "Blinkys the Blinky Swarm boss starts with (up to 4 in the house, the rest out of the side tunnels right away). Applies on the next board or Restart.",
  timerMax:
    "Starting value of the Time countdown on each board. Applies on the next board or Restart.",
  timerTickMs:
    "Milliseconds per Time point. 100 = Time drops by 10 per second once you start moving.",
  fruitLifetimeMs: "How long bonus fruit stays on the board before it disappears.",
  fruitThreshold1:
    "Board dots eaten before the first fruit appears. Scaled to the board's dot count from level 2 on; level 1 uses it as-is.",
  fruitThreshold2:
    "Board dots eaten before the second fruit appears (level 2 and up), scaled to the board's dot count.",
  deathHoldMs: "Freeze after Maze-Man is caught, before actors reset (or Game Over starts).",
  readyPauseMs: "Pause after actors reset from a death before play resumes.",
  bonusStreakIdleMs:
    "How long Maze-Man can go without eating a dot before the BONUS pellet streak breaks.",
  pinkyLookahead: "Pinky chases the tile this many tiles ahead of Maze-Man's facing.",
  inkyLookahead:
    "Inky's pivot is this many tiles ahead of Maze-Man; Inky targets Blinky's tile mirrored through that pivot.",
  clydeShyTiles:
    "Clyde chases Maze-Man only while farther than this many tiles away; closer than that he retreats to his corner.",
  elroy1DotsLeft:
    "Blinky enters Elroy 1 when this many dots or fewer remain (maze1 baseline, scaled to the board's dot count).",
  elroy2DotsLeft:
    "Blinky enters Elroy 2 when this many dots or fewer remain (maze1 baseline, scaled to the board's dot count).",
  anchorReleaseMs:
    "Time after your first move before the anchor ghost (Blinky) leaves the ghost house.",
  frontReleaseMs:
    "Time after your first move before the front-arm ghost (second to leave) leaves the ghost house (first life of a board).",
  flankReleasePellets:
    "Level 1 only: dots eaten before the third ghost out (flank slot) leaves the house (maze1 baseline, scaled to the board). From level 2 it leaves immediately.",
  reliefReleasePellets:
    "Level 1 only: dots eaten before the last ghost out (relief slot) leaves the house (maze1 baseline, scaled to the board).",
  level2ReliefDots:
    "Level 2 only: dots eaten before the relief-slot ghost leaves the house. From level 3 it leaves immediately.",
  postLifeFrontDots:
    "After a death: dots eaten since the death before the front-arm ghost leaves the house again.",
  postLifeFlankDots:
    "After a death: dots eaten since the death before the flank-slot ghost leaves the house again.",
  postLifeReliefDots:
    "After a death: dots eaten since the death before the relief-slot ghost leaves the house again.",
  idleReleaseMs:
    "Levels 1-4: if no dot is eaten for this long, the next waiting ghost is pushed out of the house.",
  idleReleaseLateMs:
    "Level 5 and up: if no dot is eaten for this long, the next waiting ghost is pushed out of the house.",
  level1ChaseOnly:
    "On: level 1 ghosts chase forever with no scatter waves. Off: level 1 uses the levels 2-4 scatter/chase schedule.",
  scatterEarlyMs:
    "Levels 2-4: length of the first two scatter waves, when ghosts head to their corners instead of chasing.",
  scatterLateMs:
    "Length of the third scatter wave on levels 2-4, and of the scatter waves from level 5 on (tapering to 60% on the last windows of levels 7-8; level 9 has none).",
  chaseMs: "Length of each chase wave between scatter waves. The final chase lasts forever.",
  wallThickness: "Width of the wall outline in pixels. Visual only; collision is unchanged.",
  wallColor: "Color of the wall outline (overrides the Settings maze color while knobs are on).",
  dotManChompSpeed:
    "How fast Dot-Man's mouth cycles while moving. 1× = one beat every 12 px of travel; default 1.25×. Visual only.",
  charmTail:
    "Show the charm bracelet: one school icon per owned upgrade on a chain behind Dot-Man. Visual only.",
  charmSize:
    "World-pixel width of each charm. Fixed in world units so it looks the same at every display scale.",
  charmSpacing:
    "Resting distance between charms along the chain, as a multiple of charm size. Below 1 they overlap.",
  charmAnchorBack: "How far behind Dot-Man's center the chain is hooked on.",
  charmWallRadius: "Collision radius of a charm against walls, as a multiple of charm size.",
  charmSpring:
    "How hard each charm is pulled back to its resting spot behind the one ahead. Higher = stiffer, less stretch.",
  charmDamping: "How quickly charm motion dies out. Lower = more swingy.",
  charmMinStretch:
    "Closest a charm may get to the one ahead, as a multiple of the resting spacing.",
  charmMaxStretch:
    "Farthest a charm may get from the one ahead, as a multiple of the resting spacing.",
  charmBounce: "Speed kept when a charm hits a wall. 0 = dead stop, 1 = perfect bounce.",
  charmBobble: "Sideways wobble of each charm while moving, as a fraction of the spacing.",
  charmBobblePeriodMs: "Time for one full bobble wave.",
  charmBaseAlpha: "Opacity of plain (not enhanced) charms.",
  charmGlowAlpha: "Opacity of the glow behind enhanced charms. 0 = no glow.",
  charmGlowScale: "Size of the enhanced glow as a multiple of charm size.",
  wallCornerRadius: "Roundness of wall corners in pixels. 0 = square corners.",
  backgroundColor: "Color behind the maze.",
};
