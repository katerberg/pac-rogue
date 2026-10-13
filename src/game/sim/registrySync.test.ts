import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_UPGRADE_IDS, UPGRADE_DEFS, type BaseUpgradeId } from "../../domain/upgrades";

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
  const covered = (id: BaseUpgradeId): boolean =>
    playSimTests.includes(`"${id}"`) || playSimTests.includes(`"${id}Plus"`);

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

describe("docs/upgrades.md upgrade table", () => {
  const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const defs = new Map(UPGRADE_DEFS.map((def) => [def.id, def]));

  it("has one up-to-date row per upgrade", () => {
    const doc = read("docs/upgrades.md");
    const stale = ALL_UPGRADE_IDS.filter((id) => {
      const base = defs.get(id)!;
      const plus = defs.get(`${id}Plus` as never);
      const row = `| \`${id}\` | ${cell(base.label)}${base.rare ? " (rare)" : ""} | ${base.school} | ${cell(base.description)} | ${cell(plus?.description ?? "")} |`;
      return !doc.includes(`\n${row}\n`);
    });
    expect(stale, "update these rows in the Upgrade table of docs/upgrades.md").toEqual([]);
  });
});
