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
  | "Visuals"
  | "Dots";

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
  "Boss",
];

export const RIGHT_KNOB_GROUPS: readonly KnobGroup[] = [
  "Ghost AI",
  "Release",
  "Scatter",
  "Visuals",
  "Dots",
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
  range("bossSwarmStartGhosts", "Boss", "Swarm start Blinkys", 2, 10, 1),
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
  range("wallThickness", "Visuals", "Wall thickness", 1, 24, 0.5, "px"),
  { key: "wallColor", group: "Visuals", label: "Wall color", kind: "color" },
  range("wallGlow", "Visuals", "Wall glow", 0, 12, 0.1),
  range("wallGlowRadius", "Visuals", "Wall glow radius", 0, 36, 1, "px"),
  range("ghostGlow", "Visuals", "Ghost glow", 0, 12, 0.1),
  range("ghostGlowRadius", "Visuals", "Ghost glow radius", 0, 36, 1, "px"),
  range("ghostLineWidth", "Visuals", "Ghost line thickness", 1, 45, 0.5, "%"),
  range("ghostWidth", "Visuals", "Line ghost width", 0.6, 4.5, 0.01, "×"),
  range("ghostHeight", "Visuals", "Line ghost height", 0.6, 4.5, 0.01, "×"),
  range("wallCornerRadius", "Visuals", "Corner radius", 0, 24, 1, "px"),
  { key: "backgroundColor", group: "Visuals", label: "Background", kind: "color" },
  range("pelletRadius", "Dots", "Dot radius", 0.5, 48, 0.1, "px"),
  range("pelletStrokeWidth", "Dots", "Dot stroke", 0.1, 32, 0.1, "px"),
  range("pelletGlow", "Dots", "Dot glow", 0, 36, 8),
  range("pelletGlowRadius", "Dots", "Dot glow radius", 0, 120, 1, "px"),
  { key: "pelletCoreColor", group: "Dots", label: "Dot core colour", kind: "color" },
  { key: "pelletGlowColor", group: "Dots", label: "Dot glow colour", kind: "color" },
  range("pelletFillOpacity", "Dots", "Dot fill opacity", 0, 1, 0.05),
  range("powerPelletRadius", "Dots", "Power radius", 0.5, 48, 0.1, "px"),
  range("powerPelletStrokeWidth", "Dots", "Power stroke", 0.1, 32, 0.1, "px"),
  range("powerPelletGlow", "Dots", "Power glow", 0, 36, 8),
  range("powerPelletGlowRadius", "Dots", "Power glow radius", 0, 120, 1, "px"),
  range("powerPelletFillOpacity", "Dots", "Power fill opacity", 0, 1, 0.05),
  range("bossPelletRadius", "Dots", "Boss radius", 0.5, 48, 0.1, "px"),
  range("bossPelletStrokeWidth", "Dots", "Boss stroke", 0.1, 32, 0.1, "px"),
  range("bossPelletGlow", "Dots", "Boss glow", 0, 36, 0.1),
  range("bossPelletGlowRadius", "Dots", "Boss glow radius", 0, 120, 1, "px"),
  range("bossPelletFillOpacity", "Dots", "Boss fill opacity", 0, 1, 0.05),
  range("optionalPelletRadius", "Dots", "Optional radius", 0.5, 48, 0.1, "px"),
  range("optionalPelletStrokeWidth", "Dots", "Optional stroke", 0.1, 32, 0.1, "px"),
  range("optionalPelletGlow", "Dots", "Optional glow", 0, 36, 0.1),
  range("optionalPelletGlowRadius", "Dots", "Optional glow radius", 0, 120, 1, "px"),
  {
    key: "optionalPelletFillColor",
    group: "Dots",
    label: "Optional fill colour",
    kind: "color",
  },
  {
    key: "optionalPelletGlowColor",
    group: "Dots",
    label: "Optional glow colour",
    kind: "color",
  },
  range("optionalPelletFillOpacity", "Dots", "Optional fill opacity", 0, 1, 0.05),
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
    "Highest ghost speed ratio the per-level growth can reach (1.0 = parity with Maze-Man).",
  ghostTunnelRatio:
    "Ghost speed inside side tunnels as a fraction of Maze-Man's base speed (the level ramp and upgrades still multiply it).",
  ghostHouseExitRatio:
    "Speed of Pinky, Inky and Clyde while leaving the ghost house, as a fraction of Maze-Man's base speed.",
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
  blinkyReleaseMs: "Time after your first move before Blinky leaves the ghost house.",
  pinkyReleaseMs:
    "Time after your first move before Pinky leaves the ghost house (first life of a board).",
  inkyReleasePellets:
    "Level 1 only: dots eaten before Inky leaves the house (maze1 baseline, scaled to the board). From level 2 Inky leaves immediately.",
  clydeReleasePellets:
    "Level 1 only: dots eaten before Clyde leaves the house (maze1 baseline, scaled to the board).",
  level2ClydeDots:
    "Level 2 only: dots eaten before Clyde leaves the house. From level 3 he leaves immediately.",
  postLifePinkyDots:
    "After a death: dots eaten since the death before Pinky leaves the house again.",
  postLifeInkyDots: "After a death: dots eaten since the death before Inky leaves the house again.",
  postLifeClydeDots:
    "After a death: dots eaten since the death before Clyde leaves the house again.",
  idleReleaseMs:
    "Levels 1-4: if no dot is eaten for this long, the next waiting ghost is pushed out of the house.",
  idleReleaseLateMs:
    "Level 5 and up: if no dot is eaten for this long, the next waiting ghost is pushed out of the house.",
  level1ChaseOnly:
    "On: level 1 ghosts chase forever with no scatter waves. Off: level 1 uses the levels 2-4 scatter/chase schedule.",
  scatterEarlyMs:
    "Levels 2-4: length of the first two scatter waves, when ghosts head to their corners instead of chasing.",
  scatterLateMs:
    "Length of the third scatter wave on levels 2-4, and of every scatter wave from level 5 on.",
  chaseMs: "Length of each chase wave between scatter waves. The final chase lasts forever.",
  wallThickness: "Width of the wall outline in pixels. Visual only; collision is unchanged.",
  wallColor: "Color of the wall outline (overrides the Settings maze color while knobs are on).",
  wallGlow:
    "Phaser outerStrength of the neon glow around the walls. 0 = no glow. With knobs on this always applies; without knobs, Settings → STYLE = PIXEL turns wall glow off.",
  wallGlowRadius: "How far the wall glow spreads beyond the outline, in pixels. 0 = no glow.",
  ghostGlow: "Phaser outerStrength of the neon glow around line-art ghosts. 0 = no glow.",
  ghostGlowRadius:
    "How far the line-art ghost glow spreads beyond the outline, in pixels. 0 = no glow.",
  ghostLineWidth:
    "Outline thickness of line-art ghosts, as a percent of the ghost's size. Visual only; collision is unchanged.",
  ghostWidth:
    "Horizontal stretch of line-art ghosts. About 1.2 makes the body as wide as the pixel ghosts. Visual only; collision is unchanged.",
  ghostHeight:
    "Vertical stretch of line-art ghosts. 1 = the SVG's own proportions. Visual only; collision is unchanged.",
  wallCornerRadius: "Roundness of wall corners in pixels. 0 = square corners.",
  backgroundColor: "Color behind the maze.",
  pelletRadius:
    "Radius of the neon regular dot in world pixels. Visual only; collision is unchanged.",
  pelletStrokeWidth: "Stroke thickness around neon regular dots in pixels. Visual only.",
  pelletGlow:
    "Phaser outerStrength of the neon glow around regular dots. 0 = no glow. With knobs on this always applies; without knobs, Settings → STYLE = PIXEL keeps PNG dots.",
  pelletGlowRadius: "How far the regular-dot glow spreads beyond the disc, in pixels. 0 = no glow.",
  pelletCoreColor: "Fill and stroke colour of neon regular, power, and boss dots (default white).",
  pelletGlowColor:
    "Glow tint for neon regular, power, and boss dots. Without knobs this follows Settings → MAZE COLOR.",
  pelletFillOpacity:
    "Fill opacity of regular neon dots (0 = hollow stroke only). Does not affect Lazy Looper optional dots.",
  powerPelletRadius: "Radius of neon power pellets. Larger than regular dots by default.",
  powerPelletStrokeWidth:
    "Stroke thickness of neon power pellets. Thicker than regular by default.",
  powerPelletGlow: "Phaser outerStrength of the neon glow around power pellets. 0 = no glow.",
  powerPelletGlowRadius: "How far the power-pellet glow spreads, in pixels. 0 = no glow.",
  powerPelletFillOpacity: "Fill opacity of neon power pellets (0 = hollow stroke only).",
  bossPelletRadius: "Base radius of neon boss pellets before the size pulse.",
  bossPelletStrokeWidth: "Stroke thickness of neon boss pellets.",
  bossPelletGlow: "Phaser outerStrength of the neon glow around boss pellets. 0 = no glow.",
  bossPelletGlowRadius: "How far the boss-pellet glow spreads, in pixels. 0 = no glow.",
  bossPelletFillOpacity: "Fill opacity of neon boss pellets (0 = hollow stroke only).",
  optionalPelletRadius: "Radius of Lazy Looper optional neon dots.",
  optionalPelletStrokeWidth: "Stroke thickness of Lazy Looper optional neon dots.",
  optionalPelletGlow:
    "Phaser outerStrength of the muted glow around Lazy Looper optional dots. 0 = no glow.",
  optionalPelletGlowRadius: "How far the optional-dot glow spreads, in pixels. 0 = no glow.",
  optionalPelletFillColor: "Fill colour inside Lazy Looper optional neon dots (default grey).",
  optionalPelletGlowColor:
    "Muted glow tint for Lazy Looper optional dots (default cool grey, not the maze wall colour).",
  optionalPelletFillOpacity:
    "Fill opacity for Lazy Looper optional neon dots (default solid grey).",
};
