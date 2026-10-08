import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { defaultPlayOptions, parsePlayOptions } from "./playOptions";

describe("parsePlayOptions", () => {
  it("defaults to a plain run with no warnings", () => {
    const { options, warnings } = parsePlayOptions(new URLSearchParams());
    expect(warnings).toEqual([]);
    expect(options).toEqual(defaultPlayOptions());
    expect(options).toMatchObject({
      seed: null,
      maze: null,
      level: null,
      quarters: null,
      bonus: null,
      ghosts: null,
      boss: null,
      bossStageAdvance: false,
      jumpToUpgrade: false,
      store: null,
      infiniteLives: false,
      lives: null,
      maxLives: null,
      godMode: false,
      knobs: false,
      disableLevelUpgrades: false,
      enableUpgrades: [],
      forceUpgrade: null,
      highScoresDisabled: false,
    });
  });

  it("reads every flag", () => {
    const { options, warnings } = parsePlayOptions(
      new URLSearchParams(
        "seed=abc&maze=maze1&level=4&quarters=3&bonus=120&ghosts=pinky&boss=chainedGhosts&bossStageAdvance=1&jumpToUpgrade=1&store=1&disableLevelUpgrades=1&infiniteLives=1&lives=2&maxLives=6&godMode=1&knobs=1&enableUpgrade=powerPelletFreeze&forceUpgrade=passiveRemoteTransferencePlus",
      ),
    );
    expect(warnings).toEqual([]);
    expect(options).toEqual({
      seed: "abc",
      maze: "maze1",
      level: 4,
      quarters: 3,
      bonus: 120,
      ghosts: [GHOST_KIND.pinky],
      boss: "chainedGhosts",
      bossStageAdvance: true,
      jumpToUpgrade: true,
      store: 1,
      disableLevelUpgrades: true,
      infiniteLives: true,
      lives: 2,
      maxLives: 6,
      godMode: true,
      knobs: true,
      enableUpgrades: ["powerPelletFreeze"],
      forceUpgrade: "passiveRemoteTransference",
      highScoresDisabled: true,
    });
  });

  it("warns once per invalid flag, in flag order", () => {
    const { warnings } = parsePlayOptions(
      new URLSearchParams(
        "seed=a%20b&maze=nope&level=0&quarters=-1&bonus=300&boss=nope&lives=0&maxLives=x",
      ),
    );
    expect(warnings).toEqual([
      "Unknown ?seed= value; expected 1-32 of A-Z a-z 0-9 _ -",
      "Unknown ?maze= value; expected maze1|maze2|mazeSmall",
      "Unknown ?level= value; expected positive integer",
      "Unknown ?quarters= value; expected non-negative integer",
      "Unknown ?bonus= value; expected an integer 0..299",
      "Unknown ?boss= value; expected blinkySwarm|chainedGhosts",
      "Unknown ?lives= value; expected positive integer",
      "Unknown ?maxLives= value; expected positive integer",
    ]);
  });

  it("jumps to the boss level for ?boss= unless ?level= is given", () => {
    expect(parsePlayOptions(new URLSearchParams("boss=blinkySwarm")).options).toMatchObject({
      boss: "blinkySwarm",
      level: 9,
      highScoresDisabled: true,
    });
    expect(
      parsePlayOptions(new URLSearchParams("boss=chainedGhosts&level=3")).options,
    ).toMatchObject({ boss: "chainedGhosts", level: 3 });
    expect(parsePlayOptions(new URLSearchParams("boss=nope")).options.level).toBeNull();
  });

  it("defaults maxLives to lives unless maxLives is set", () => {
    expect(parsePlayOptions(new URLSearchParams("lives=7")).options).toMatchObject({
      lives: 7,
      maxLives: 7,
    });
    expect(parsePlayOptions(new URLSearchParams("lives=7&maxLives=2")).options).toMatchObject({
      lives: 7,
      maxLives: 2,
    });
    expect(parsePlayOptions(new URLSearchParams("maxLives=6")).options).toMatchObject({
      lives: null,
      maxLives: 6,
    });
  });
});
