import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultPlayOptions } from "../../domain/playOptions";
import { ALL_UPGRADE_IDS, type BaseUpgradeId } from "../../domain/upgrades";
import { PlaySim } from "./playSim";

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), "utf8");

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n${heading}\n`);
  expect(start, `${heading} missing`).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + heading.length + 2);
  const end = rest.search(/\n#{1,3} /);
  return end === -1 ? rest : rest.slice(0, end);
}

function tableFirstCells(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|")[1]!.trim());
}

const KNOWN_UNTESTED_UPGRADES: ReadonlySet<BaseUpgradeId> = new Set([
  "passiveGhostHouseDelay",
  "passiveSpeedSpecialist",
  "passiveProtectionSpecialist",
  "passiveDisruptionSpecialist",
]);

describe("upgrade registry completeness", () => {
  const playSimTests = read("src/game/sim/playSim.test.ts");
  const covered = (id: BaseUpgradeId): boolean => playSimTests.includes(`"${id}`);

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

describe("docs/upgrades.md", () => {
  it("has one Current defs row per upgrade", () => {
    const rows = tableFirstCells(section(read("docs/upgrades.md"), "### Current defs")).map(
      (cell) => cell.replaceAll("`", ""),
    );
    expect(
      [...rows].sort(),
      `docs/upgrades.md lists ${rows.length}, UPGRADE_DEFS has ${ALL_UPGRADE_IDS.length}`,
    ).toEqual([...ALL_UPGRADE_IDS].sort());
  });
});

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function documentedSnapshotPaths(): string[] {
  const cells = tableFirstCells(section(read("docs/VERIFICATION.md"), "### Game-state snapshot"));
  return cells
    .flatMap((cell) => cell.match(/`[^`]+`/g) ?? [])
    .map((span) => span.slice(1, -1))
    .flatMap(expandBraces);
}

function expandBraces(path: string): string[] {
  const match = /^(.*)\{([^{}]*)\}(.*)$/.exec(path);
  if (match === null) {
    return [path];
  }
  return match[2]!.split(",").flatMap((part) => expandBraces(`${match[1]}${part}${match[3]}`));
}

function covers(documented: string, actual: string): boolean {
  const doc = documented.split(".");
  const act = actual.split(".");
  const isPlaceholder = (seg: string): boolean => /^<.*>$/.test(seg);
  const shared = Math.min(doc.length, act.length);
  const prefixMatches = doc
    .slice(0, shared)
    .every((seg, i) => isPlaceholder(seg) || seg === act[i]);
  const documentedIsShorter = doc.length < act.length;
  return prefixMatches && (!documentedIsShorter || isPlaceholder(doc[doc.length - 1]!));
}

function leafPaths(prefix: string, value: Json, depth: number): string[] {
  const isRecord = typeof value === "object" && value !== null && !Array.isArray(value);
  if (!isRecord || depth === 0) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(`${prefix}.${key}`, child, depth - 1),
  );
}

function sceneOnlySnapshotKeys(): string[] {
  const source = read("src/game/scenes/PlayScene.ts");
  const start = source.indexOf("public debugSnapshot()");
  expect(start, "PlayScene.debugSnapshot missing").toBeGreaterThanOrEqual(0);
  const body = source.slice(start, source.indexOf("\n  }\n", start));
  return [...body.matchAll(/^ {6}(\w+):/gm)].map((match) => match[1]!);
}

describe("docs/VERIFICATION.md game-state snapshot table", () => {
  const sim = new PlaySim({ ...defaultPlayOptions(), level: 2 }, "doc-sync");
  sim.start();
  const simSnapshot = JSON.parse(JSON.stringify(sim.snapshot())) as Record<string, Json>;
  const documented = documentedSnapshotPaths();

  const actualPaths = [
    ...Object.entries(simSnapshot).flatMap(([key, value]) => leafPaths(`play.${key}`, value, 2)),
    ...sceneOnlySnapshotKeys().map((key) => `play.${key}`),
    "scenes.PlayScene",
    "play",
    "runLog.stored",
    "runLog.overrun",
    "sounds.menu-music",
  ];

  it("documents every snapshot field", () => {
    const missing = actualPaths.filter((path) => !documented.some((doc) => covers(doc, path)));
    expect(missing, "add these to the Game-state snapshot table in docs/VERIFICATION.md").toEqual(
      [],
    );
  });

  it("documents no top-level play.* field the snapshot lacks", () => {
    const actualTop = new Set(actualPaths.map((path) => path.split(".").slice(0, 2).join(".")));
    const stale = documented
      .filter((path) => path.startsWith("play."))
      .map((path) => path.split(".").slice(0, 2).join("."))
      .filter((top) => !actualTop.has(top));
    expect([...new Set(stale)], "remove these from the table").toEqual([]);
  });
});
