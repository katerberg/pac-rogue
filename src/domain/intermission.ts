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
  return levelIndex === INTERMISSION_AFTER_LEVEL;
}

export function pickIntermission(next: () => number): IntermissionId {
  return INTERMISSION_IDS[Math.floor(next() * INTERMISSION_IDS.length)]!;
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
