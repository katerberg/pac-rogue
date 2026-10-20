import { parsePenniesParam } from "./penniesFlag";
import { parseJumpToSpinnerFlag, parseSlotParam, type SlotOutcome } from "./slotMachine";
import { parseSlotMachineFlag } from "./slotMachineFlag";
import { parseBossStageAdvanceFlag } from "./bossStageAdvanceFlag";
import { BOSS_LEVEL, parseBossParam, type BossId } from "./bossRules";
import type { GhostKindId } from "./ghostKind";
import { parseGhostsParam } from "./ghostsFlag";
import { GHOST_ROSTERS, parseRosterId } from "./ghostRoster";
import { parseGodModeFlag } from "./godModeFlag";
import { parseJumpToUpgradeFlag } from "./jumpToUpgradeFlag";
import { parseKnobsFlag } from "./knobsFlag";
import { parseLevelModifiersFlag } from "./levelModifiersFlag";
import { parseInfiniteLivesFlag, parseLivesCountParam } from "./lives";
import type { MazeLayoutId } from "./mazeLayouts";
import { parseMazeOverride } from "./mazeOverride";
import { mazePoolSize } from "./mazePool";
import { parseQuartersParam } from "./quartersFlag";
import { highScoresDisabled } from "./runHistory";
import { parseLevelParam } from "./runLevel";
import { parseSeedParam } from "./runRandom";
import { parseStoreFlag, type StoreIndex } from "./storeFlag";
import {
  parseDisableLevelUpgradesFlag,
  parseEnableUpgradeParams,
  parseForceUpgradeParam,
  type BaseUpgradeId,
  type UpgradeId,
} from "./upgrades";

export type PlayOptions = {
  seed: string | null;
  maze: MazeLayoutId | number | null;
  mazeAscii: string | null;
  level: number | null;
  quarters: number | null;
  pennyCharge: number | null;
  ghosts: GhostKindId[] | null;
  roster: number | null;
  boss: BossId | null;
  bossStageAdvance: boolean;
  jumpToUpgrade: boolean;
  jumpToSpinner: boolean;
  store: StoreIndex | null;
  disableLevelUpgrades: boolean;
  infiniteLives: boolean;
  lives: number | null;
  maxLives: number | null;
  godMode: boolean;
  knobs: boolean;
  levelModifiers: boolean;
  enableUpgrades: UpgradeId[];
  forceUpgrade: BaseUpgradeId | null;
  forceStartingUpgrade: BaseUpgradeId | null;
  slot: SlotOutcome | null;
  slotMachine: boolean;
  highScoresDisabled: boolean;
};

export function defaultPlayOptions(): PlayOptions {
  return parsePlayOptions(new URLSearchParams()).options;
}

export function parsePlayOptions(params: URLSearchParams): {
  options: PlayOptions;
  warnings: string[];
} {
  const warnings: string[] = [];
  const warnIf = (flag: string, invalid: boolean, message: string): void => {
    if (params.has(flag) && invalid) {
      warnings.push(message);
    }
  };
  const seed = parseSeedParam(params);
  warnIf("seed", seed === null, "Unknown ?seed= value; expected 1-32 of A-Z a-z 0-9 _ -");
  const maze = parseMazeOverride(params);
  warnIf(
    "maze",
    maze === null,
    `Unknown ?maze= value; expected maze1|maze2|mazeSmall or pool index 0..${mazePoolSize() - 1}`,
  );
  const level = parseLevelParam(params);
  warnIf("level", level === null, "Unknown ?level= value; expected positive integer");
  const quarters = parseQuartersParam(params);
  warnIf("quarters", quarters === null, "Unknown ?quarters= value; expected non-negative integer");
  const pennyCharge = parsePenniesParam(params);
  warnIf(
    "pennyCharge",
    pennyCharge === null,
    "Unknown ?pennyCharge= value; expected an integer 0..299",
  );
  const ghosts = parseGhostsParam(params);
  warnIf(
    "ghosts",
    ghosts === null,
    "Unknown ?ghosts= value; expected comma-separated blinky|pinky|inky|clyde|spunky|wardy",
  );
  const roster = parseRosterId(params.get("roster"));
  warnIf(
    "roster",
    roster === null,
    `Unknown ?roster= value; expected an integer 0..${GHOST_ROSTERS.length - 1}`,
  );
  const boss = parseBossParam(params);
  warnIf("boss", boss === null, "Unknown ?boss= value; expected blinkySwarm|chainedGhosts");
  const lives = parseLivesCountParam(params, "lives");
  warnIf("lives", lives === null, "Unknown ?lives= value; expected positive integer");
  const slot = parseSlotParam(params);
  warnIf("slot", slot === null, "Unknown ?slot= value; expected 0 or e.g. 2q1u1l (up to 5 lines)");
  const maxLives = parseLivesCountParam(params, "maxLives");
  warnIf("maxLives", maxLives === null, "Unknown ?maxLives= value; expected positive integer");
  return {
    options: {
      seed,
      maze,
      mazeAscii: null,
      level: level ?? (boss !== null && !params.has("level") ? BOSS_LEVEL : null),
      quarters,
      pennyCharge,
      ghosts,
      roster,
      boss,
      bossStageAdvance: parseBossStageAdvanceFlag(params),
      jumpToUpgrade: parseJumpToUpgradeFlag(params),
      jumpToSpinner: parseJumpToSpinnerFlag(params),
      store: parseStoreFlag(params),
      disableLevelUpgrades: parseDisableLevelUpgradesFlag(params),
      infiniteLives: parseInfiniteLivesFlag(params),
      lives,
      maxLives: maxLives ?? lives,
      godMode: parseGodModeFlag(params),
      knobs: parseKnobsFlag(params),
      levelModifiers: parseLevelModifiersFlag(params),
      enableUpgrades: parseEnableUpgradeParams(params),
      forceUpgrade: parseForceUpgradeParam(params),
      forceStartingUpgrade: null,
      slot,
      slotMachine: parseSlotMachineFlag(params),
      highScoresDisabled: highScoresDisabled(params),
    },
    warnings,
  };
}
