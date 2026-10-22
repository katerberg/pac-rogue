import { bananaGrab } from "./intermissionBananaGrab";
import { blinkyChase } from "./intermissionBlinkyChase";
import { defyDeath } from "./intermissionDefyDeath";
import { freeze } from "./intermissionFreeze";
import { ghostPass } from "./intermissionGhostPass";
import { scatterBurst } from "./intermissionScatterBurst";
import { shieldBounce } from "./intermissionShieldBounce";
import { speedBurst } from "./intermissionSpeedBurst";
import {
  DEFAULT_INTERMISSION_CAST,
  type IntermissionBeat,
  type IntermissionCast,
  type IntermissionScript,
} from "./intermissionScript";

export const INTERMISSION_AFTER_LEVEL = 2;
const INTERMISSION_LEVELS: readonly number[] = [INTERMISSION_AFTER_LEVEL, 4];

const INTERMISSION_SCRIPTS = {
  blinkyChase,
  bananaGrab,
  shieldBounce,
  ghostPass,
  speedBurst,
  freeze,
  scatterBurst,
  defyDeath,
} satisfies Record<string, IntermissionScript>;

export type IntermissionId = keyof typeof INTERMISSION_SCRIPTS;

export const INTERMISSION_IDS = Object.keys(INTERMISSION_SCRIPTS) as IntermissionId[];

export type IntermissionFrame = IntermissionBeat & { id: IntermissionId; done: boolean };

export function hasIntermissionAfter(levelIndex: number): boolean {
  return INTERMISSION_LEVELS.includes(levelIndex);
}

export function pickIntermission(next: () => number, previous?: IntermissionId): IntermissionId {
  const pool = INTERMISSION_IDS.filter((id) => id !== previous);
  return pool[Math.floor(next() * pool.length)]!;
}

export function intermissionFrame(
  id: IntermissionId,
  elapsedMs: number,
  cast: IntermissionCast = DEFAULT_INTERMISSION_CAST,
): IntermissionFrame {
  const script = INTERMISSION_SCRIPTS[id];
  return { id, ...script.beatAt(elapsedMs, cast), done: elapsedMs >= script.durationMs };
}

export function parseIntermissionParam(params: URLSearchParams): IntermissionId | null {
  const raw = params.get("intermission");
  return INTERMISSION_IDS.find((id) => id === raw) ?? null;
}
