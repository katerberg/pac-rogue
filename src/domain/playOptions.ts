import { parseBonusParam } from "./bonusFlag";
import { BOSS_DEFS, parseBossGhostsParam } from "./bossRules";
import { parseForceCorruptionParams, type ForcedCorruption } from "./corruption";
import type { GhostKindId } from "./ghostKind";
import { parseGhostsParam } from "./ghostsFlag";
import { parseJumpToUpgradeFlag } from "./jumpToUpgradeFlag";
import { parseInfiniteLivesFlag } from "./lives";
import { parseMazeParam, type MazeLayoutId } from "./mazeLayouts";
import { parseQuartersParam } from "./quartersFlag";
import { highScoresDisabled } from "./runHistory";
import { parseLevelParam } from "./runLevel";
import { parseSeedParam } from "./runRandom";
import { parseStoreFlag, type StoreIndex } from "./storeFlag";
import {
  parseDisableLevelUpgradesFlag,
  parseEnableUpgradeParams,
  type UpgradeId,
} from "./upgrades";

export type PlayOptions = {
  seed: string | null;
  maze: MazeLayoutId | null;
  level: number | null;
  quarters: number | null;
  bonus: number | null;
  forcedCorruption: ForcedCorruption;
  ghosts: GhostKindId[] | null;
  bossGhosts: number | null;
  jumpToUpgrade: boolean;
  store: StoreIndex | null;
  disableLevelUpgrades: boolean;
  infiniteLives: boolean;
  enableUpgrades: UpgradeId[];
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
  const maze = parseMazeParam(params);
  warnIf("maze", maze === null, "Unknown ?maze= value; expected maze1|maze2|mazeSmall");
  const level = parseLevelParam(params);
  warnIf("level", level === null, "Unknown ?level= value; expected positive integer");
  const quarters = parseQuartersParam(params);
  warnIf("quarters", quarters === null, "Unknown ?quarters= value; expected non-negative integer");
  const bonus = parseBonusParam(params);
  warnIf("bonus", bonus === null, "Unknown ?bonus= value; expected an integer 0..299");
  const forcedCorruption = parseForceCorruptionParams(params);
  warnIf(
    "forceCorruption",
    forcedCorruption.type === null,
    "Unknown ?forceCorruption= value; expected slimeTrail|invisibility|freeRetargetReverse|speedSurge|wallPhaseDash|pelletDropper|falseScatter",
  );
  warnIf(
    "forceCorruptionGhost",
    forcedCorruption.ghostKind === null,
    "Unknown ?forceCorruptionGhost= value; expected pinky|inky|clyde",
  );
  const ghosts = parseGhostsParam(params);
  warnIf(
    "ghosts",
    ghosts === null,
    "Unknown ?ghosts= value; expected comma-separated blinky|pinky|inky|clyde",
  );
  const bossGhosts = parseBossGhostsParam(params, BOSS_DEFS.doubleBlinky);
  warnIf(
    "bossGhosts",
    bossGhosts === null,
    "Unknown ?bossGhosts= value; expected an integer 2..10",
  );
  return {
    options: {
      seed,
      maze,
      level,
      quarters,
      bonus,
      forcedCorruption,
      ghosts,
      bossGhosts,
      jumpToUpgrade: parseJumpToUpgradeFlag(params),
      store: parseStoreFlag(params),
      disableLevelUpgrades: parseDisableLevelUpgradesFlag(params),
      infiniteLives: parseInfiniteLivesFlag(params),
      enableUpgrades: parseEnableUpgradeParams(params),
      highScoresDisabled: highScoresDisabled(params),
    },
    warnings,
  };
}
