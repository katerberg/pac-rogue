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
      bossGhosts: null,
      jumpToUpgrade: false,
      store: null,
      infiniteLives: false,
      godMode: false,
      disableLevelUpgrades: false,
      enableUpgrades: [],
      highScoresDisabled: false,
    });
  });

  it("reads every flag", () => {
    const { options, warnings } = parsePlayOptions(
      new URLSearchParams(
        "seed=abc&maze=maze1&level=4&quarters=3&bonus=120&ghosts=pinky&bossGhosts=5&jumpToUpgrade=1&store=1&disableLevelUpgrades=1&infiniteLives=1&godMode=1&enableUpgrade=powerPelletFreeze",
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
      bossGhosts: 5,
      jumpToUpgrade: true,
      store: 1,
      disableLevelUpgrades: true,
      infiniteLives: true,
      godMode: true,
      enableUpgrades: ["powerPelletFreeze"],
      highScoresDisabled: true,
    });
  });

  it("warns once per invalid flag, in flag order", () => {
    const { warnings } = parsePlayOptions(
      new URLSearchParams("seed=a%20b&maze=nope&level=0&quarters=-1&bonus=300&bossGhosts=99"),
    );
    expect(warnings).toEqual([
      "Unknown ?seed= value; expected 1-32 of A-Z a-z 0-9 _ -",
      "Unknown ?maze= value; expected maze1|maze2|mazeSmall",
      "Unknown ?level= value; expected positive integer",
      "Unknown ?quarters= value; expected non-negative integer",
      "Unknown ?bonus= value; expected an integer 0..299",
      "Unknown ?bossGhosts= value; expected an integer 2..10",
    ]);
  });
});
