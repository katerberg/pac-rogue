import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  addCount,
  addLoadout,
  beginLevelLog,
  createRunLog,
  didWrap,
  finishRun,
  HITCH_FRAME_MS,
  HITCH_WINDOW_MS,
  isNearMiss,
  LAST_PELLETS_COUNT,
  NEAR_MISS_COOLDOWN_MS,
  notePace,
  removeLoadout,
  type ActivationKind,
  type DeathLog,
  type GhostName,
  type LevelLog,
  type LevelLogInit,
  type PowerPelletSource,
  type QuarterSource,
  type RunLogMeta,
  type RunLogRecord,
  type RunOutcome,
  type StoreVisitLog,
  type TimedEffect,
  type UpgradeSource,
} from "../../domain/runLog";
import type { FruitKind } from "../../domain/fruit";
import type { StorePurchase } from "../../domain/store";
import type { BaseUpgradeId, UpgradeChoiceOffer, UpgradeId } from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

import type { Point } from "../../domain/warpGlide";

type BoardSize = { width: number; height: number; tileSize: number };
type RunTotals = { pelletsCollected: number; quarters: number; lives: number };

const GHOST_NAME_BY_KIND = Object.fromEntries(
  Object.entries(GHOST_KIND).map(([name, kind]) => [kind, name]),
) as Record<GhostKindId, GhostName>;

export function ghostName(world: World, eid: number | null): GhostName | null {
  if (eid === null || !hasComponent(world, eid, GhostKind)) {
    return null;
  }
  return GHOST_NAME_BY_KIND[(GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId] ?? null;
}

export class RunRecorder {
  readonly record: RunLogRecord;
  private level: LevelLog | null = null;
  private clockMs = 0;
  private recentFrames: { atMs: number; deltaMs: number }[] = [];
  private nearMissAtMs = new Map<number, number>();
  private lastPelletsStartMs: number | null = null;
  private offerAtMs: number | null = null;
  private visit: StoreVisitLog | null = null;
  private visitStartMs = 0;

  constructor(meta: RunLogMeta, seed: string, debug: boolean) {
    this.record = createRunLog(meta, seed, debug);
  }

  get outcome(): RunOutcome {
    return this.record.outcome;
  }

  advance(delta: number): void {
    this.clockMs += delta;
  }

  beginLevel(init: LevelLogInit): void {
    this.level = beginLevelLog(this.record, init);
    this.recentFrames = [];
    this.nearMissAtMs.clear();
    this.lastPelletsStartMs = null;
  }

  playFrame(delta: number, active: Record<TimedEffect, boolean>): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    level.simMs += delta;
    level.maxFrameMs = Math.max(level.maxFrameMs, delta);
    if (delta > HITCH_FRAME_MS) {
      level.hitchFrames += 1;
    }
    this.recentFrames.push({ atMs: level.simMs, deltaMs: delta });
    while (
      this.recentFrames.length > 0 &&
      level.simMs - this.recentFrames[0]!.atMs > HITCH_WINDOW_MS
    ) {
      this.recentFrames.shift();
    }
    for (const effect of Object.keys(active) as TimedEffect[]) {
      if (active[effect]) {
        addCount(level.activeMs, effect, delta);
      }
    }
  }

  movement(
    before: Point,
    after: Point,
    board: BoardSize,
    hasInput: boolean,
    warping: boolean,
    delta: number,
  ): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    if (level.firstMoveMs === null && hasInput) {
      level.firstMoveMs = level.simMs;
    }
    const wrapped =
      didWrap(before.x, after.x, board.width) || didWrap(before.y, after.y, board.height);
    if (wrapped) {
      level.tunnelWraps += 1;
      return;
    }
    if (warping) {
      return;
    }
    const moved = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    if (moved === 0 && level.firstMoveMs !== null) {
      level.idleMs += delta;
    }
    level.tilesTraveled += moved / board.tileSize;
  }

  nearMisses(world: World, tileSize: number): void {
    const level = this.level;
    const playerEid = query(world, [Player, Position])[0];
    if (level === null || playerEid === undefined) {
      return;
    }
    const px = Position.x[playerEid] ?? 0;
    const py = Position.y[playerEid] ?? 0;
    for (const eid of query(world, [Ghost, GhostPhase, Position])) {
      if (GhostPhase.value[eid] === GHOST_PHASE.inHouse) {
        continue;
      }
      const distance = Math.hypot((Position.x[eid] ?? 0) - px, (Position.y[eid] ?? 0) - py);
      const last = this.nearMissAtMs.get(eid);
      if (
        isNearMiss(distance, tileSize) &&
        (last === undefined || level.simMs - last >= NEAR_MISS_COOLDOWN_MS)
      ) {
        level.nearMisses += 1;
        this.nearMissAtMs.set(eid, level.simMs);
      }
    }
  }

  pellets(collected: number, remaining: number, countdown: number): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    level.pelletsCollected = collected;
    notePace(level, collected, collected + remaining, level.simMs, countdown);
    if (this.lastPelletsStartMs === null && remaining <= LAST_PELLETS_COUNT) {
      this.lastPelletsStartMs = level.simMs;
    }
  }

  tunnelDash(): void {
    if (this.level !== null) {
      this.level.tunnelDashes += 1;
    }
  }

  powerPellets(source: PowerPelletSource, count: number): void {
    if (this.level !== null && count > 0) {
      this.level.powerPellets[source] += count;
    }
  }

  activation(kind: ActivationKind, count = 1): void {
    if (this.level !== null && count > 0) {
      addCount(this.level.activations, kind, count);
    }
  }

  target(kind: "freeze" | "recall", ghost: GhostName | null): void {
    if (this.level !== null && ghost !== null) {
      this.level.targets[kind].push(ghost);
    }
  }

  warp(from: Point, to: Point, tileSize: number): void {
    this.activation("warp");
    const tiles = Math.hypot(to.x - from.x, to.y - from.y) / tileSize;
    this.level?.targets.warpTiles.push(Math.round(tiles * 10) / 10);
  }

  scatterBurst(ghosts: number): void {
    this.activation("scatterBurst");
    this.level?.targets.scatterGhosts.push(ghosts);
  }

  fruitSpawned(kind: FruitKind): void {
    this.level?.fruit.push({ kind, spawnedMs: this.level.simMs, eatenMs: null });
  }

  fruitEaten(count: number): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    let left = count;
    for (const fruit of level.fruit) {
      if (left === 0) {
        return;
      }
      if (fruit.eatenMs === null) {
        fruit.eatenMs = level.simMs;
        left -= 1;
      }
    }
  }

  quarters(source: QuarterSource, amount: number): void {
    if (this.level !== null && amount > 0) {
      addCount(this.level.quartersEarned, source, amount);
    }
  }

  bonus(tier: number, filled: number): void {
    if (this.level !== null) {
      this.level.bonusMaxTier = Math.max(this.level.bonusMaxTier, tier);
      this.level.bonusFills += filled;
    }
  }

  turnSpark(kind: "perfect" | "close"): void {
    if (this.level !== null) {
      this.level.turnTuning[kind] += 1;
    }
  }

  death(death: Omit<DeathLog, "simMs" | "maxFrameMsLastSecond">): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    level.deaths.push({
      ...death,
      simMs: level.simMs,
      maxFrameMsLastSecond: Math.max(0, ...this.recentFrames.map((frame) => frame.deltaMs)),
    });
  }

  levelCleared(countdown: number, timeBonusPoints: number): void {
    const level = this.level;
    if (level === null) {
      return;
    }
    level.cleared = true;
    level.pace.p100 ??= { simMs: level.simMs, countdown };
    level.countdownEnd = countdown;
    level.timeBonusPoints = timeBonusPoints;
    if (this.lastPelletsStartMs !== null) {
      level.lastPelletsMs = level.simMs - this.lastPelletsStartMs;
    }
  }

  livesStart(lives: number): void {
    if (this.level !== null) {
      this.level.livesStart = lives;
      this.lives(lives);
    }
  }

  livesRegenerated(before: number, after: number): void {
    if (this.level !== null) {
      this.level.livesRegenerated = after - before;
      this.level.livesEnd = after;
      this.lives(after);
    }
  }

  lives(lives: number): void {
    this.record.livesMax = Math.max(this.record.livesMax, lives);
    if (this.level !== null) {
      this.level.livesMax = Math.max(this.level.livesMax, lives);
    }
  }

  offered(offer: UpgradeChoiceOffer): void {
    if (this.level !== null) {
      this.level.offer = {
        upgrades: [...offer.upgrades],
        quarters: offer.quarters,
        picked: null,
        choiceMs: null,
      };
      this.offerAtMs = this.clockMs;
    }
  }

  picked(choice: BaseUpgradeId | "quarters"): void {
    const offer = this.level?.offer;
    if (offer) {
      offer.picked = choice;
      offer.choiceMs = this.offerAtMs === null ? null : this.clockMs - this.offerAtMs;
    }
  }

  storeOpened(afterLevel: number, quartersIn: number, stock: string[]): void {
    this.visit = { afterLevel, quartersIn, quartersOut: null, stock, purchases: [], simMs: 0 };
    this.visitStartMs = this.clockMs;
  }

  storePurchase(purchase: StorePurchase): void {
    this.visit?.purchases.push({ ...purchase });
  }

  storeClosed(quartersOut: number): void {
    if (this.visit === null) {
      return;
    }
    this.visit.quartersOut = quartersOut;
    this.visit.simMs = this.clockMs - this.visitStartMs;
    this.record.storeVisits.push(this.visit);
    this.visit = null;
  }

  gained(id: UpgradeId, source: UpgradeSource, level: number): void {
    addLoadout(this.record, id, source, level);
  }

  lost(id: UpgradeId, level: number): void {
    removeLoadout(this.record, id, level);
  }

  paused(ms: number): void {
    if (this.level !== null) {
      this.level.pausedMs += ms;
      this.level.pauseCount += 1;
    }
  }

  hidden(ms: number): void {
    if (this.level !== null) {
      this.level.hiddenMs += ms;
    }
  }

  finish(outcome: Exclude<RunOutcome, "inProgress">): boolean {
    return finishRun(this.record, outcome);
  }

  snapshotRecord(totals: RunTotals): RunLogRecord {
    this.record.pelletsCollected = totals.pelletsCollected;
    this.record.quartersUnspent = totals.quarters;
    this.lives(totals.lives);
    return structuredClone(this.record);
  }
}
