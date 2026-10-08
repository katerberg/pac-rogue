import { describe, expect, it } from "vitest";
import { createBonusBar, tickStreakIdle } from "./bonusBar";
import { beginDeathSequence, tickDeathSequence } from "./deathSequence";
import { eatDragAfterCollect, eatDragMultiplier } from "./eatDrag";
import { createFruitPresence, tickFruitPresence } from "./fruit";
import { GHOST_KIND } from "./ghostKind";
import { GHOST_AI_MODE } from "./ghostMode";
import { GHOST_DIR } from "./ghostPath";
import { idleReleaseLimitMs, releaseDelayMs, releaseDots } from "./ghostRelease";
import { resolveGhostSpeedForKind } from "./ghostSpeed";
import { GHOST_PHASE, clydeTarget, pinkyTarget } from "./ghostTarget";
import { ghostModeWavesForLevel } from "./levelRules";
import { playerPreTurnPx, playerSpeed } from "./playfield";
import { createRunClock, tickRunClock } from "./runClock";
import {
  DOTMAN_CHOMP_PIXELS_AT_1X,
  DOTMAN_MOUTH_CLOSED_HALF_DEG,
  DOTMAN_MOUTH_OPEN_HALF_DEG,
  dotManChompPixelsPerFrame,
  resolveDotManMouthAngles,
} from "./dotManMouth";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";

describe("tuning threads into gameplay helpers", () => {
  it("maps Dot-Man chomp speed to travel per mouth beat", () => {
    expect(DEFAULT_TUNING.dotManChompSpeed).toBe(1.25);
    expect(dotManChompPixelsPerFrame(DEFAULT_TUNING.dotManChompSpeed)).toBe(
      DOTMAN_CHOMP_PIXELS_AT_1X / 1.25,
    );
    expect(dotManChompPixelsPerFrame(resolveTuning({ dotManChompSpeed: 1 }).dotManChompSpeed)).toBe(
      DOTMAN_CHOMP_PIXELS_AT_1X,
    );
  });

  it("defaults mouth open/closed half-angles", () => {
    expect(DEFAULT_TUNING.dotManMouthOpenDeg).toBe(DOTMAN_MOUTH_OPEN_HALF_DEG);
    expect(DEFAULT_TUNING.dotManMouthClosedDeg).toBe(DOTMAN_MOUTH_CLOSED_HALF_DEG);
    expect(resolveDotManMouthAngles(70, 5)).toEqual({ openHalfDeg: 70, closedHalfDeg: 5 });
  });

  it("builds scatter waves from the scatter knobs", () => {
    const tuned = resolveTuning({ scatterEarlyMs: 1000, chaseMs: 3000, scatterLateMs: 500 });
    expect(ghostModeWavesForLevel(2, tuned).map((w) => w.durationMs)).toEqual([
      1000,
      3000,
      1000,
      3000,
      500,
      Number.POSITIVE_INFINITY,
    ]);
    expect(ghostModeWavesForLevel(6, tuned)[0]!.durationMs).toBe(500);
    expect(ghostModeWavesForLevel(1, tuned)).toHaveLength(1);
    const scatterL1 = ghostModeWavesForLevel(1, resolveTuning({ level1ChaseOnly: false }));
    expect(scatterL1[0]).toEqual({ mode: GHOST_AI_MODE.scatter, durationMs: 7000 });
  });

  it("uses the eat drag knobs", () => {
    const tuned = resolveTuning({ eatDragMs: 200, eatDragPeak: 0.5, eatDragPowerMs: 900 });
    expect(eatDragAfterCollect(0, 1, 0, tuned)).toBe(200);
    expect(eatDragAfterCollect(0, 0, 1, tuned)).toBe(900);
    expect(eatDragMultiplier(200, tuned)).toBeCloseTo(0.5);
    expect(eatDragMultiplier(100, resolveTuning({ eatDragMs: 0 }))).toBe(1);
  });

  it("starts and ticks the run clock from the timer knobs", () => {
    const tuned = resolveTuning({ timerMax: 50, timerTickMs: 20 });
    const clock = createRunClock(tuned);
    expect(clock.remaining).toBe(50);
    expect(tickRunClock(clock, true, 100, tuned).remaining).toBe(45);
  });

  it("holds the death sequence for the tuned times", () => {
    const tuned = resolveTuning({ deathHoldMs: 100, readyPauseMs: 50 });
    const held = tickDeathSequence(beginDeathSequence(false), 100, tuned);
    expect(held.events).toEqual(["resetActors"]);
    expect(tickDeathSequence(held.state, 50, tuned).events).toEqual(["resume"]);
    expect(tickDeathSequence(beginDeathSequence(false), 100).events).toEqual([]);
  });

  it("breaks the bonus streak after the tuned idle", () => {
    const bar = { ...createBonusBar(), streak: 3 };
    expect(tickStreakIdle(bar, 100, 100).streak).toBe(0);
    expect(tickStreakIdle(bar, 100).streak).toBe(3);
  });

  it("releases ghosts on the tuned timers and dot counts", () => {
    const tuned = resolveTuning({
      blinkyReleaseMs: 900,
      level2ClydeDots: 5,
      postLifeInkyDots: 2,
      idleReleaseMs: 1000,
    });
    expect(releaseDelayMs(GHOST_KIND.blinky, 0, tuned)).toBe(900);
    expect(releaseDots(GHOST_KIND.clyde, 2, false, 0, tuned)).toBe(5);
    expect(releaseDots(GHOST_KIND.inky, 3, true, 0, tuned)).toBe(2);
    expect(idleReleaseLimitMs(1, 0, tuned)).toBe(1000);
  });

  it("spawns and despawns level-1 fruit on the tuned threshold and lifetime", () => {
    const tuned = resolveTuning({ fruitThreshold1: 5, fruitLifetimeMs: 1000 });
    const spawn = tickFruitPresence(createFruitPresence(), 5, 0, 1, { tuning: tuned });
    expect(spawn.action).toBe("spawn");
    expect(spawn.state.remainingMs).toBe(1000);
    expect(tickFruitPresence(createFruitPresence(), 5, 0, 1).action).toBe("none");
  });

  it("scales ghost and player speeds from the tuned ratios", () => {
    const tuned = resolveTuning({ playerSpeedTiles: 10, ghostHouseExitRatio: 1 });
    expect(playerSpeed(tuned)).toBe(playerSpeed(DEFAULT_TUNING) * (10 / 7.315));
    expect(resolveGhostSpeedForKind(GHOST_KIND.pinky, 100, false, 1, true, 0, tuned)).toBeCloseTo(
      playerSpeed(tuned),
    );
    expect(playerPreTurnPx(resolveTuning({ preTurnPx: 7 }))).toBe(7);
  });

  it("targets with the tuned lookahead and shy radius", () => {
    const base = {
      phase: GHOST_PHASE.active,
      mode: GHOST_AI_MODE.chase,
      playerCol: 10,
      playerRow: 10,
    };
    const pinky = pinkyTarget({
      ...base,
      playerFacing: GHOST_DIR.right,
      tuning: resolveTuning({ pinkyLookahead: 7 }),
    });
    expect(pinky).toEqual({ col: 17, row: 10 });
    const clyde = clydeTarget({
      ...base,
      ghostCol: 13,
      ghostRow: 10,
      tuning: resolveTuning({ clydeShyTiles: 2 }),
    });
    expect(clyde).toEqual({ col: 10, row: 10 });
  });
});
