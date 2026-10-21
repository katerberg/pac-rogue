import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLowPowerId } from "../../domain/lowPowerUpgrades";
import {
  ALL_UPGRADE_IDS,
  LEARN_NO_EFFECT_UPGRADE_IDS,
  UPGRADE_DEFS,
  isSpecialist,
  type BaseUpgradeId,
} from "../../domain/upgrades";

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), "utf8");

const KNOWN_UNTESTED_UPGRADES: ReadonlySet<BaseUpgradeId> = new Set([
  "passiveGhostHouseDelay",
  "passiveSpeedSpecialist",
  "passiveProtectionSpecialist",
  "passiveDisruptionSpecialist",
]);

describe("upgrade registry completeness", () => {
  const playSimTests = read("src/game/sim/playSim.test.ts");
  const coversAllLowPower = playSimTests.includes("it.each(LOW_POWER_IDS)");
  const covered = (id: BaseUpgradeId): boolean =>
    playSimTests.includes(`"${id}"`) ||
    playSimTests.includes(`"${id}Plus"`) ||
    (coversAllLowPower && isLowPowerId(id));

  it("has a PlaySim test for every upgrade, except the known gaps", () => {
    const missing = ALL_UPGRADE_IDS.filter(
      (id) => !covered(id) && !KNOWN_UNTESTED_UPGRADES.has(id),
    );
    expect(
      missing,
      "add a PlaySim test that grants each of these (src/game/sim/playSim.test.ts)",
    ).toEqual([]);
  });

  it("drops an upgrade from the known gaps once it has a test", () => {
    const stale = [...KNOWN_UNTESTED_UPGRADES].filter(covered);
    expect(stale, "remove these from KNOWN_UNTESTED_UPGRADES").toEqual([]);
  });
});

describe("LEARN upgrade coverage", () => {
  const learnTests = read("src/game/sim/learnSim.test.ts");
  const coversAllLowPower = learnTests.includes("it.each(LOW_POWER_IDS)");
  const covered = (id: BaseUpgradeId): boolean =>
    learnTests.includes(`"${id}"`) ||
    learnTests.includes(`"${id}Plus"`) ||
    (coversAllLowPower && isLowPowerId(id));

  it("has a LearnSim test for every listed upgrade, or marks it no-effect", () => {
    const missing = ALL_UPGRADE_IDS.filter(
      (id) => !isSpecialist(id) && !covered(id) && !LEARN_NO_EFFECT_UPGRADE_IDS.includes(id),
    );
    expect(
      missing,
      "add a LearnSim test that grants each of these (src/game/sim/learnSim.test.ts), or list it in LEARN_NO_EFFECT_UPGRADE_IDS and docs/learn.md",
    ).toEqual([]);
  });

  it("drops an upgrade from the no-effect list once it has a LearnSim test", () => {
    expect(LEARN_NO_EFFECT_UPGRADE_IDS.filter(covered)).toEqual([]);
  });
});

describe("docs/upgrade-list.md upgrade table", () => {
  const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const defs = new Map<string, (typeof UPGRADE_DEFS)[number]>(
    UPGRADE_DEFS.map((def) => [def.id, def]),
  );

  it("has one up-to-date row per upgrade", () => {
    const doc = read("docs/upgrade-list.md");
    const stale = ALL_UPGRADE_IDS.filter((id) => {
      const base = defs.get(id)!;
      const plus = defs.get(`${id}Plus`);
      const row = `| \`${id}\` | ${cell(base.label)}${base.rare ? " (rare)" : ""} | ${base.school} | ${cell(base.description)} | ${cell(plus?.description ?? "")} |`;
      return !doc.includes(`\n${row}\n`);
    });
    expect(stale, "update these rows in the Upgrade table of docs/upgrade-list.md").toEqual([]);
  });
});
