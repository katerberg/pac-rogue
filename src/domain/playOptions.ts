import { parseBonusParam } from "./bonusFlag";
import { parseBossStageAdvanceFlag } from "./bossStageAdvanceFlag";
import { BOSS_LEVEL, parseBossParam, type BossId } from "./bossRules";
import type { GhostKindId } from "./ghostKind";
import { parseGhostsParam } from "./ghostsFlag";
import { parseGodModeFlag } from "./godModeFlag";
import { parseJumpToUpgradeFlag } from "./jumpToUpgradeFlag";
import { parseKnobsFlag } from "./knobsFlag";
import { parseInfiniteLivesFlag, parseLivesCountParam } from "./lives";
import { parseMazeParam, type MazeLayoutId } from "./mazeLayouts";
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
  maze: MazeLayoutId | null;
  level: number | null;
  quarters: number | null;
  bonus: number | null;
  ghosts: GhostKindId[] | null;
  boss: BossId | null;
  bossStageAdvance: boolean;
  jumpToUpgrade: boolean;
  store: StoreIndex | null;
  disableLevelUpgrades: boolean;
  infiniteLives: boolean;
  lives: number | null;
  maxLives: number | null;
  godMode: boolean;
  knobs: boolean;
  enableUpgrades: UpgradeId[];
  forceUpgrade: BaseUpgradeId | null;
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
  const ghosts = parseGhostsParam(params);
  warnIf(
    "ghosts",
    ghosts === null,
    "Unknown ?ghosts= value; expected comma-separated blinky|pinky|inky|clyde",
  );
  const boss = parseBossParam(params);
  warnIf("boss", boss === null, "Unknown ?boss= value; expected blinkySwarm|chainedGhosts");
  const lives = parseLivesCountParam(params, "lives");
  warnIf("lives", lives === null, "Unknown ?lives= value; expected positive integer");
  const maxLives = parseLivesCountParam(params, "maxLives");
  warnIf("maxLives", maxLives === null, "Unknown ?maxLives= value; expected positive integer");
  return {
    options: {
      seed,
      maze,
      level: level ?? (boss !== null && !params.has("level") ? BOSS_LEVEL : null),
      quarters,
      bonus,
      ghosts,
      boss,
      bossStageAdvance: parseBossStageAdvanceFlag(params),
      jumpToUpgrade: parseJumpToUpgradeFlag(params),
      store: parseStoreFlag(params),
      disableLevelUpgrades: parseDisableLevelUpgradesFlag(params),
      infiniteLives: parseInfiniteLivesFlag(params),
      lives,
      maxLives: maxLives ?? lives,
      godMode: parseGodModeFlag(params),
      knobs: parseKnobsFlag(params),
      enableUpgrades: parseEnableUpgradeParams(params),
      forceUpgrade: parseForceUpgradeParam(params),
      highScoresDisabled: highScoresDisabled(params),
    },
    warnings,
  };
}
