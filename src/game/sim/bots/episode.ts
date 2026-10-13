import { BOSS_LEVEL } from "../../../domain/bossRules";
import type { GhostKindId } from "../../../domain/ghostKind";
import { getActiveLayout } from "../../../domain/maze";
import { defaultPlayOptions, type PlayOptions } from "../../../domain/playOptions";
import { createRunRandom } from "../../../domain/runRandom";
import { pickStartingUpgrade, type UpgradeId } from "../../../domain/upgrades";
import { PlaySim } from "../playSim";
import { FRAME_MS } from "../simTesting";
import { Bot } from "./bot";

const LEVEL_CAP_MS = 240_000;

export type ExperimentId = "builds" | "singles" | "pairs" | "schools" | "enemies";

export type Job = {
  experiment: ExperimentId;
  arm: string;
  profile: string;
  seed: string;
  level?: number;
  upgrades?: UpgradeId[];
  ghosts?: GhostKindId[];
  roster?: number;
};

export type EpisodeOutcome = "reachedBoss" | "clear" | "death" | "stalled" | "error";

export type EpisodeResult = {
  job: Job;
  outcome: EpisodeOutcome;
  levelReached: number;
  progress: number;
  simMs: number;
  deaths: { level: number; ghost: string | null; ghostMode: string }[];
  ghostOutMs: Record<string, number>;
  offers: { level: number; offered: string[]; took: string | null }[];
  finalLoadout: string[];
  quartersSpent: number;
  storeStall: boolean;
  error?: string;
};

function optionsFor(job: Job): PlayOptions {
  const base = { ...defaultPlayOptions(), roster: job.roster ?? null };
  if (job.experiment === "builds") {
    const start = pickStartingUpgrade([], createRunRandom(job.seed).stream("startingUpgrade"));
    return {
      ...base,
      level: 2,
      jumpToUpgrade: true,
      enableUpgrades: start === null ? [] : [start],
    };
  }
  return {
    ...base,
    level: job.level ?? 5,
    disableLevelUpgrades: true,
    enableUpgrades: job.upgrades ?? [],
    ghosts: job.ghosts ?? null,
  };
}

function finished(sim: PlaySim, job: Job, startLevel: number): EpisodeOutcome | null {
  if (job.experiment === "builds") {
    return sim.currentLevel() >= BOSS_LEVEL ? "reachedBoss" : null;
  }
  return sim.currentLevel() > startLevel || sim.storeState() !== null ? "clear" : null;
}

export function runJob(job: Job): EpisodeResult {
  const sim = new PlaySim(optionsFor(job), job.seed);
  const bot = new Bot(job.profile, job.seed, FRAME_MS);
  let outcome: EpisodeOutcome | null = null;
  let simMs = 0;
  let error: string | undefined;
  try {
    sim.start();
    const startLevel = sim.currentLevel();
    let level = startLevel;
    let levelMs = 0;
    while (outcome === null) {
      const choice = bot.pick(sim);
      if (choice !== null) {
        sim.chooseUpgrade(choice);
      }
      const events = sim.step(bot.step(sim), FRAME_MS);
      simMs += FRAME_MS;
      levelMs += FRAME_MS;
      if (sim.currentLevel() !== level) {
        level = sim.currentLevel();
        levelMs = 0;
      }
      if (events.some((event) => event.type === "endText" && event.title === "GAME OVER")) {
        outcome = "death";
      } else if (levelMs > LEVEL_CAP_MS) {
        outcome = "stalled";
      } else {
        outcome = finished(sim, job, startLevel);
      }
    }
  } catch (caught) {
    outcome = "error";
    error = caught instanceof Error ? caught.message : String(caught);
  }
  const record = sim.runLogRecord();
  const lastLevel = record.levels.at(-1);
  const progress =
    outcome === "clear" || outcome === "reachedBoss" || sim.storeState() !== null
      ? 1
      : Math.min(
          1,
          (lastLevel?.pelletsCollected ?? 0) / Math.max(1, getActiveLayout().pelletCount),
        );
  return {
    job,
    outcome,
    levelReached: sim.currentLevel(),
    progress: Math.round(progress * 1000) / 1000,
    simMs: Math.round(simMs),
    deaths: record.levels.flatMap((level) =>
      level.deaths.map((death) => ({
        level: level.level,
        ghost: death.ghost,
        ghostMode: death.ghostMode,
      })),
    ),
    ghostOutMs: Object.fromEntries(
      Object.entries(bot.ghostOutMs).map(([kind, ms]) => [kind, Math.round(ms)]),
    ),
    offers: record.levels
      .filter((level) => level.offer !== null)
      .map((level) => ({
        level: level.level,
        offered: [...level.offer!.upgrades],
        took: level.offer!.picked,
      })),
    finalLoadout: [...sim.snapshot().upgrades],
    quartersSpent: record.storeVisits.reduce(
      (sum, visit) => sum + visit.purchases.reduce((spent, purchase) => spent + purchase.price, 0),
      0,
    ),
    storeStall: bot.store.stalled,
    ...(error === undefined ? {} : { error }),
  };
}
