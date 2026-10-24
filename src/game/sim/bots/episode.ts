import { BOSS_LEVEL } from "../../../domain/bossRules";
import type { GhostKindId } from "../../../domain/ghostKind";
import { getActiveLayout } from "../../../domain/maze";
import { defaultPlayOptions, type PlayOptions } from "../../../domain/playOptions";
import type { UpgradeId } from "../../../domain/upgrades";
import { PlaySim } from "../playSim";
import { FRAME_MS } from "../simTesting";
import { Bot, type DeathCause } from "./bot";

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

export type EpisodeDeath = {
  level: number;
  ghost: string | null;
  ghostMode: string;
  cause: DeathCause;
};

export type EpisodeResult = {
  job: Job;
  outcome: EpisodeOutcome;
  levelReached: number;
  progress: number;
  simMs: number;
  deaths: EpisodeDeath[];
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
    return { ...base, level: 1 };
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

export function answerPrompts(sim: PlaySim, bot: Bot): void {
  const choice = bot.pick(sim);
  if (choice !== null) {
    sim.chooseUpgrade(choice);
  }
  if (sim.salvagePrompt() !== null) {
    const outgoing = bot.salvage(sim);
    if (outgoing === null) {
      sim.salvageNew();
    } else {
      sim.salvageReplace(outgoing);
    }
  }
}

export function runJob(job: Job): EpisodeResult {
  const sim = new PlaySim(optionsFor(job), job.seed);
  const bot = new Bot(job.profile, job.seed, FRAME_MS);
  const causes: DeathCause[] = [];
  let outcome: EpisodeOutcome | null = null;
  let simMs = 0;
  let error: string | undefined;
  try {
    sim.start();
    const startLevel = sim.currentLevel();
    let level = startLevel;
    let levelMs = 0;
    while (outcome === null) {
      answerPrompts(sim, bot);
      const events = sim.step(bot.step(sim), FRAME_MS);
      simMs += FRAME_MS;
      levelMs += FRAME_MS;
      while (job.experiment === "builds" && causes.length < sim.deathCount()) {
        causes.push(bot.deathCause(sim));
      }
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
  try {
    return episodeResult(sim, bot, job, outcome, simMs, causes, error);
  } catch (caught) {
    return {
      job,
      outcome: "error",
      levelReached: job.level ?? 0,
      progress: 0,
      simMs: Math.round(simMs),
      deaths: [],
      ghostOutMs: {},
      offers: [],
      finalLoadout: [],
      quartersSpent: 0,
      storeStall: false,
      error: error ?? (caught instanceof Error ? caught.message : String(caught)),
    };
  }
}

function episodeResult(
  sim: PlaySim,
  bot: Bot,
  job: Job,
  outcome: EpisodeOutcome,
  simMs: number,
  causes: readonly DeathCause[],
  error: string | undefined,
): EpisodeResult {
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
    deaths: record.levels
      .flatMap((level) => level.deaths.map((death) => ({ level: level.level, death })))
      .map(({ level, death }, index) => ({
        level,
        ghost: death.ghost,
        ghostMode: death.ghostMode,
        cause: death.lava || death.bossGhost ? "hazard" : (causes[index] ?? "unknown"),
      })),
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
