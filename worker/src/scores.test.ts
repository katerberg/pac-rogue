import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { RunLogRecord } from "../../src/domain/runLog";
import { UPSERT_RUN, upsertRunValues } from "./runs";
import { BOARD_LIMIT, SELECT_BOARD, toBoardRow, UPSERT_BEST, type BoardDbRow } from "./scores";
import { finishedRecord } from "./testRecord";

function sql(path: string): string {
  return readFileSync(`worker/${path}`, "utf8");
}

type Db = InstanceType<typeof DatabaseSync>;

function database(withBests: boolean): Db {
  const db = new DatabaseSync(":memory:");
  db.exec(sql("migrations/0001_runs.sql"));
  if (withBests) {
    db.exec(sql("migrations/0002_bests.sql"));
  }
  return db;
}

let serial = 0;

function install(n: number): string {
  return `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
}

function store(db: Db, overrides: Partial<RunLogRecord>, receivedAt: string): RunLogRecord {
  serial += 1;
  const id = `aaaaaaaa-0000-4000-8000-${String(serial).padStart(12, "0")}`;
  const record = finishedRecord({ id, ...overrides });
  const meta = { country: "US", ipHash: "h", receivedAt };
  db.prepare(UPSERT_RUN).run(...(upsertRunValues({ platform: "web", record }, meta) as string[]));
  if (db.prepare("SELECT name FROM sqlite_master WHERE name = 'bests'").get() !== undefined) {
    db.prepare(UPSERT_BEST).run(record.id, record.installId);
  }
  return record;
}

function board(db: Db): BoardDbRow[] {
  return db.prepare(SELECT_BOARD).all(BOARD_LIMIT) as BoardDbRow[];
}

function summary(db: Db): string[] {
  return board(db).map((row) => `${row.install_id[0]}:${row.pellets}:${row.reach}`);
}

describe("bests", () => {
  it("keeps one best per install, from death and complete runs only", () => {
    const db = database(true);
    store(db, { installId: install(1), pelletsCollected: 100 }, "2026-10-12T01:00:00Z");
    store(
      db,
      { installId: install(1), pelletsCollected: 300, finalLevel: 3 },
      "2026-10-12T02:00:00Z",
    );
    store(
      db,
      { installId: install(1), pelletsCollected: 200, finalLevel: 5 },
      "2026-10-12T03:00:00Z",
    );
    store(
      db,
      { installId: install(2), pelletsCollected: 900, outcome: "quit" },
      "2026-10-12T04:00:00Z",
    );
    store(
      db,
      { installId: install(2), pelletsCollected: 900, outcome: "abandoned" },
      "2026-10-12T04:00:00Z",
    );
    store(
      db,
      { installId: install(3), pelletsCollected: 300, finalLevel: 9, outcome: "complete" },
      "2026-10-12T05:00:00Z",
    );
    expect(summary(db)).toEqual(["3:300:10", "1:300:3"]);
  });

  it("breaks pellet ties by reach, then by who got there first", () => {
    const db = database(true);
    store(
      db,
      { installId: install(1), pelletsCollected: 50, finalLevel: 2 },
      "2026-10-12T01:00:00Z",
    );
    store(
      db,
      { installId: install(2), pelletsCollected: 50, finalLevel: 2 },
      "2026-10-12T02:00:00Z",
    );
    store(
      db,
      { installId: install(3), pelletsCollected: 50, finalLevel: 4 },
      "2026-10-12T03:00:00Z",
    );
    store(
      db,
      { installId: install(1), pelletsCollected: 50, finalLevel: 2 },
      "2026-10-12T04:00:00Z",
    );
    expect(summary(db)).toEqual(["3:50:4", "1:50:2", "2:50:2"]);
    expect(board(db)[1]!.received_at).toBe("2026-10-12T01:00:00Z");
  });

  it("caps reach at the last level for a death and never takes a hidden run", () => {
    const db = database(true);
    store(
      db,
      { installId: install(1), pelletsCollected: 10, finalLevel: 40 },
      "2026-10-12T01:00:00Z",
    );
    expect(summary(db)).toEqual(["1:10:9"]);
    const cheat = store(
      db,
      { installId: install(2), pelletsCollected: 1, outcome: "quit" },
      "2026-10-12T02:00:00Z",
    );
    db.prepare("UPDATE runs SET hidden_reason = 'test', outcome = 'death' WHERE id = ?").run(
      cheat.id,
    );
    db.prepare(UPSERT_BEST).run(cheat.id, cheat.installId);
    expect(summary(db)).toEqual(["1:10:9"]);
  });

  it("never credits a run to another install", () => {
    const db = database(true);
    const run = store(db, { installId: install(1), pelletsCollected: 10 }, "2026-10-12T01:00:00Z");
    db.prepare(UPSERT_BEST).run(run.id, install(2));
    expect(summary(db)).toEqual(["1:10:1"]);
  });

  it("backfills on migration and rebuilds after a hide with the same ranking", () => {
    const db = database(false);
    store(db, { installId: install(1), pelletsCollected: 100 }, "2026-10-12T01:00:00Z");
    store(db, { installId: install(1), pelletsCollected: 400 }, "2026-10-12T02:00:00Z");
    const top = store(
      db,
      { installId: install(2), pelletsCollected: 900, outcome: "complete" },
      "2026-10-12T03:00:00Z",
    );
    store(
      db,
      { installId: install(3), pelletsCollected: 999, outcome: "quit" },
      "2026-10-12T04:00:00Z",
    );
    db.exec(sql("migrations/0002_bests.sql"));
    expect(summary(db)).toEqual(["2:900:10", "1:400:1"]);

    db.prepare("UPDATE runs SET hidden_reason = 'cheat' WHERE install_id = ?").run(top.installId);
    db.exec(sql("sql/rebuild-bests.sql"));
    expect(summary(db)).toEqual(["1:400:1"]);
  });

  it("maps rows without ids and marks only the requester's row", () => {
    const row: BoardDbRow = {
      install_id: install(1),
      pellets: 5,
      reach: 2,
      country: "US",
      received_at: "2026-10-12T01:00:00Z",
    };
    expect(toBoardRow(row, install(1))).toEqual({
      pellets: 5,
      reach: 2,
      country: "US",
      receivedAt: "2026-10-12T01:00:00Z",
      mine: true,
    });
    expect(toBoardRow(row, null).mine).toBe(false);
    expect(toBoardRow(row, install(2)).mine).toBe(false);
  });
});
