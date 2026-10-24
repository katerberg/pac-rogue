import { GHOST_AI_MODE, type GhostAiMode } from "../../../domain/ghostMode";
import { ghostDirStep } from "../../../domain/ghostPath";
import { GHOST_PHASE } from "../../../domain/ghostPhase";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../../domain/maze";
import { defaultPlayOptions } from "../../../domain/playOptions";
import { Facing } from "../../components/Facing";
import { DIRECTION, type Direction } from "../../components/Input";
import { Position } from "../../components/Position";
import { nameOf } from "../../systems/worldSnapshot";
import { PlaySim } from "../playSim";
import { FRAME_MS } from "../simTesting";
import { Bot } from "./bot";
import { answerPrompts } from "./episode";
import { cellOf, Observer, playerEid, sampleGhosts, type GhostSample } from "./observe";
import { tickGhost, type PlannerGhost, type PlannerState } from "./planner";
import { profileFor } from "./profiles";

export type FidelitySample = {
  kind: string;
  phase: string;
  modeFlipped: boolean;
  elroy: number;
  horizonFrames: number;
  errorTiles: number;
};

export type FidelityOptions = {
  profile: string;
  seed: string;
  level: number;
  frames: number;
  everyFrames: number;
  horizons: readonly number[];
};

type Frame = {
  playerCell: number | null;
  facing: Direction;
  ghosts: GhostSample[];
  mode: string;
  elroy: number;
};

const ghostIn = (frame: Frame | undefined, eid: number) =>
  frame?.ghosts.find((ghost) => ghost.eid === eid);

export function measureGhostPrediction(options: FidelityOptions): FidelitySample[] {
  const sim = new PlaySim(
    { ...defaultPlayOptions(), level: options.level, disableLevelUpgrades: true },
    options.seed,
  );
  const bot = new Bot(options.profile, options.seed, FRAME_MS);
  const observer = new Observer();
  const skill = profileFor(options.profile).skill;
  sim.start();
  const frames: Frame[] = [];
  const states: { frame: number; state: PlannerState }[] = [];
  for (let frame = 0; frame < options.frames; frame += 1) {
    answerPrompts(sim, bot);
    sim.step(bot.step(sim), FRAME_MS);
    const eid = playerEid(sim.world);
    const { grid } = observer.grid();
    const snapshot = sim.snapshot();
    const ghosts = sampleGhosts(sim.world);
    const playerCell =
      eid === undefined ? null : cellOf(grid, Position.x[eid] ?? 0, Position.y[eid] ?? 0);
    const facing = (eid === undefined ? DIRECTION.none : Facing.direction[eid]) as Direction;
    frames.push({
      playerCell,
      facing,
      ghosts,
      mode: snapshot.ghostMode,
      elroy: snapshot.elroyTier,
    });
    if (frame % options.everyFrames === 0 && playerCell !== null && sim.offer() === null) {
      const decision = { current: playerCell, cell: playerCell, distPx: 0, facing };
      states.push({ frame, state: observer.plannerState(sim, ghosts, decision, skill) });
    }
  }
  const tile = getActiveLayout().tileSize;
  const samples: FidelitySample[] = [];
  for (const { frame, state } of states) {
    const grid = state.grid;
    const tilesPerFrame = FRAME_MS / state.stepMs;
    for (const horizon of options.horizons) {
      const target = frames[frame + horizon];
      if (target === undefined) {
        continue;
      }
      const span = frames.slice(frame, frame + horizon);
      const flipped = span.some((at) => at.mode !== frames[frame]!.mode);
      for (const planned of state.ghosts) {
        const sample = ghostIn(frames[frame], planned.eid);
        const actual = ghostIn(target, planned.eid);
        const paused = span.some((at, i) => {
          const next = ghostIn(frames[frame + i + 1], planned.eid);
          const now = ghostIn(at, planned.eid);
          return now !== undefined && next !== undefined && now.x === next.x && now.y === next.y;
        });
        if (sample === undefined || actual === undefined || (horizon > 0 && paused)) {
          continue;
        }
        const ghost: PlannerGhost = { ...planned };
        for (const at of span) {
          if (at.playerCell === null) {
            continue;
          }
          const player = {
            col: at.playerCell % grid.cols,
            row: Math.floor(at.playerCell / grid.cols),
            facing: at.facing,
          };
          const blinky = at.ghosts.find((g) => g.kind === "blinky");
          const blinkyCell = blinky === undefined ? null : cellOf(grid, blinky.x, blinky.y);
          const blinkyTile =
            blinkyCell === null
              ? player
              : { col: blinkyCell % grid.cols, row: Math.floor(blinkyCell / grid.cols) };
          const mode: GhostAiMode =
            GHOST_AI_MODE[at.mode as keyof typeof GHOST_AI_MODE] ?? GHOST_AI_MODE.chase;
          tickGhost(
            state,
            ghost,
            ghost.speed * tilesPerFrame,
            tilesPerFrame,
            player,
            blinkyTile,
            mode,
          );
        }
        const { dx: stepX, dy: stepY } = ghostDirStep(ghost.dir);
        const rawX = Math.abs(
          ghost.col + stepX * ghost.progress - (actual.x - cellCenterX(0)) / tile,
        );
        const rawY = Math.abs(
          ghost.row + stepY * ghost.progress - (actual.y - cellCenterY(0)) / tile,
        );
        samples.push({
          kind: sample.kind,
          phase: nameOf(GHOST_PHASE, sample.phase),
          modeFlipped: flipped,
          elroy: frames[frame]!.elroy,
          horizonFrames: horizon,
          errorTiles: Math.min(rawX, grid.cols - rawX) + Math.min(rawY, grid.rows - rawY),
        });
      }
    }
  }
  return samples;
}

export type FidelityBucket = { n: number; mean: number; over2: number };

export function summarizeFidelity(
  samples: readonly FidelitySample[],
): Record<string, FidelityBucket> {
  const groups = new Map<string, number[]>();
  const add = (key: string, value: number) => groups.set(key, [...(groups.get(key) ?? []), value]);
  for (const s of samples) {
    add(`h${s.horizonFrames}|all`, s.errorTiles);
    add(`h${s.horizonFrames}|phase:${s.phase}`, s.errorTiles);
    add(`h${s.horizonFrames}|kind:${s.kind}`, s.errorTiles);
    add(`h${s.horizonFrames}|flip:${s.modeFlipped}`, s.errorTiles);
    add(`h${s.horizonFrames}|elroy:${s.elroy}`, s.errorTiles);
  }
  return Object.fromEntries(
    [...groups].map(([key, values]) => [
      key,
      {
        n: values.length,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        over2: values.filter((v) => v > 2).length / values.length,
      },
    ]),
  );
}
