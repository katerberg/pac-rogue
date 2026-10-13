import { GHOST_PHASE } from "../../../domain/ghostPhase";
import { createRunRandom } from "../../../domain/runRandom";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../../domain/maze";
import type { UpgradeChoiceOption } from "../../../domain/upgrades";
import { Facing } from "../../components/Facing";
import { DIRECTION, type Direction } from "../../components/Input";
import { Position } from "../../components/Position";
import { Speed } from "../../components/Speed";
import { KEY_FOR_DIRECTION, NO_KEYS_HELD, type HeldKeys } from "../../systems/heldKeys";
import type { PlaySim } from "../playSim";
import { IDLE_INPUT, type SimInput } from "../simInput";
import {
  bestExit,
  neighbor,
  openExits,
  reverseOf,
  scoreExits,
  type CardinalDirection,
} from "./navigate";
import { cellOf, Observer, playerEid, sampleGhosts, type GhostSample } from "./observe";
import { pickOffer } from "./pick";
import { profileFor, type Profile } from "./profiles";
import { StoreBot } from "./storeBot";

const LEAD_TILES = 0.75;
const STUCK_FRAMES = 90;

export function gaussianFrom(rng: () => number): () => number {
  return () => {
    const u = Math.max(rng(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
}

type Decision = { current: number; cell: number; distPx: number; facing: Direction };

function decisionAhead(sim: PlaySim, observer: Observer): Decision | null {
  const eid = playerEid(sim.world);
  if (eid === undefined) {
    return null;
  }
  const { grid } = observer.grid();
  const x = Position.x[eid] ?? 0;
  const y = Position.y[eid] ?? 0;
  const cell = cellOf(grid, x, y);
  if (cell === null) {
    return null;
  }
  const facing = (Facing.direction[eid] ?? DIRECTION.none) as Direction;
  const cx = cellCenterX(cell % grid.cols);
  const cy = cellCenterY(Math.floor(cell / grid.cols));
  const ahead =
    facing === DIRECTION.right
      ? cx - x
      : facing === DIRECTION.left
        ? x - cx
        : facing === DIRECTION.down
          ? cy - y
          : facing === DIRECTION.up
            ? y - cy
            : 0;
  if (ahead >= -0.5 || facing === DIRECTION.none) {
    return { current: cell, cell, distPx: Math.max(0, ahead), facing };
  }
  const next = neighbor(grid, cell, facing as CardinalDirection);
  return next === -1
    ? { current: cell, cell, distPx: 0, facing }
    : { current: cell, cell: next, distPx: ahead + getActiveLayout().tileSize, facing };
}

export class Bot {
  readonly profile: Profile;
  readonly store: StoreBot;
  readonly ghostOutMs: Record<string, number> = {};
  private readonly rng: () => number;
  private readonly gaussian: () => number;
  private readonly observer = new Observer();
  private readonly history: GhostSample[][] = [];
  private readonly delayFrames: number;
  private frame = 0;
  private simMs = 0;
  private planCell: number | null = null;
  private pending: { direction: Direction; atFrame: number } | null = null;
  private held: Direction = DIRECTION.none;
  private heldStamp = 0;
  private releaseFrames = 0;
  private lastPos = { x: 0, y: 0 };
  private stillFrames = 0;

  constructor(
    profileId: string,
    seed: string,
    private readonly frameMs: number,
  ) {
    this.profile = profileFor(profileId);
    this.rng = createRunRandom(seed).stream("bot");
    this.gaussian = gaussianFrom(this.rng);
    this.delayFrames = Math.round(this.profile.skill.reactionMs / this.frameMs);
    this.store = new StoreBot(this.profile.persona, this.rng, this.observer);
  }

  pick(sim: PlaySim): UpgradeChoiceOption | null {
    const offer = sim.offer();
    return offer === null
      ? null
      : pickOffer(offer, sim.hud().upgrades, this.profile.persona, this.rng);
  }

  step(sim: PlaySim): SimInput {
    const frameMs = this.frameMs;
    this.frame += 1;
    this.simMs += frameMs;
    if (sim.offer() !== null) {
      this.reset();
      return IDLE_INPUT;
    }
    if (sim.storeState() !== null) {
      this.reset();
      return { ...IDLE_INPUT, ...this.store.input(sim, frameMs) };
    }
    const ghosts = sampleGhosts(sim.world);
    this.recordGhostTime(ghosts, frameMs);
    this.history.push(ghosts);
    if (this.history.length > this.delayFrames + 1) {
      this.history.shift();
    }
    if (this.releaseFrames > 0) {
      this.releaseFrames -= 1;
      return IDLE_INPUT;
    }
    this.steer(sim);
    return { ...IDLE_INPUT, keys: this.keys() };
  }

  private reset(): void {
    this.planCell = null;
    this.pending = null;
    this.held = DIRECTION.none;
    this.releaseFrames = 1;
  }

  private recordGhostTime(ghosts: readonly GhostSample[], frameMs: number): void {
    for (const ghost of ghosts) {
      if (ghost.phase !== GHOST_PHASE.inHouse) {
        this.ghostOutMs[ghost.kind] = (this.ghostOutMs[ghost.kind] ?? 0) + frameMs;
      }
    }
  }

  private steer(sim: PlaySim): void {
    const decision = decisionAhead(sim, this.observer);
    if (decision === null) {
      return;
    }
    this.trackStuck(sim, decision);
    if (decision.cell !== this.planCell) {
      this.plan(sim, decision);
    }
    if (this.pending !== null && this.frame >= this.pending.atFrame) {
      this.held = this.pending.direction;
      this.heldStamp = this.simMs;
      this.pending = null;
    }
  }

  private trackStuck(sim: PlaySim, decision: Decision): void {
    const pos = sim.playerWorldPosition();
    if (pos === null) {
      return;
    }
    const moved = Math.abs(pos.x - this.lastPos.x) + Math.abs(pos.y - this.lastPos.y) > 0.01;
    this.lastPos = { x: pos.x, y: pos.y };
    this.stillFrames = moved ? 0 : this.stillFrames + 1;
    if (this.stillFrames >= STUCK_FRAMES) {
      this.stillFrames = 0;
      const exits = openExits(this.observer.grid().grid, decision.cell);
      if (exits.length > 0) {
        this.pending = {
          direction: exits[Math.floor(this.rng() * exits.length)]!,
          atFrame: this.frame,
        };
      }
    }
  }

  private plan(sim: PlaySim, decision: Decision): void {
    this.planCell = decision.cell;
    const delayed = this.history[0] ?? [];
    const view = this.observer.view(sim, delayed);
    const scores = scoreExits(
      view,
      decision.current,
      decision.cell,
      decision.facing,
      this.profile.persona.weights,
      this.gaussian,
    );
    const reverse = reverseOf(decision.facing);
    let choice: Direction | null = bestExit(scores);
    const mistakeRate = this.profile.skill.mistakeRate * this.profile.persona.mistakeMul;
    if (scores.length > 1 && this.rng() < mistakeRate) {
      choice = scores[Math.floor(this.rng() * scores.length)]!.direction;
    }
    if (choice === null || (choice === this.held && this.pending === null)) {
      this.pending = null;
      return;
    }
    const jitterFrames = (this.gaussian() * this.profile.skill.jitterMs) / this.frameMs;
    let atFrame = this.frame + Math.abs(jitterFrames);
    if (choice !== decision.facing && choice !== reverse) {
      const pxPerSecond = Speed.px[playerEid(sim.world) ?? -1] ?? 0;
      const pxPerFrame = Math.max(0.5, (pxPerSecond * this.frameMs) / 1000);
      const leadPx = LEAD_TILES * getActiveLayout().tileSize;
      atFrame = this.frame + Math.max(0, (decision.distPx - leadPx) / pxPerFrame) + jitterFrames;
    }
    this.pending = { direction: choice, atFrame: Math.max(this.frame, Math.round(atFrame)) };
  }

  private keys(): HeldKeys {
    const key = KEY_FOR_DIRECTION[this.held];
    return key === undefined ? NO_KEYS_HELD : { ...NO_KEYS_HELD, [key]: this.heldStamp };
  }
}
