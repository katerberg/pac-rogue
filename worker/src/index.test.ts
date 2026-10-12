import { describe, expect, it } from "vitest";
import worker, { type Env } from "./index";
import { RATE_LIMIT_MAX } from "./runs";
import { BOARD_LIMIT, type BoardDbRow } from "./scores";
import { INSTALL_ID, finishedRecord } from "./testRecord";

type Call = { sql: string; values: unknown[] };

function fakeDb(recentCount = 0, board: BoardDbRow[] = []) {
  const calls: Call[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            first: async () => ({ n: recentCount }),
            all: async () => ({ results: board }),
          };
        },
      };
    },
    batch: async (statements: unknown[]) => statements.map(() => ({ success: true })),
  };
  return { db: db as unknown as D1Database, calls };
}

const IP = "203.0.113.7";

function post(body: unknown, raw?: string): Request {
  return new Request("https://api.test/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": IP },
    body: raw ?? JSON.stringify(body),
  });
}

function env(recentCount = 0, board: BoardDbRow[] = []) {
  const { db, calls } = fakeDb(recentCount, board);
  const value: Env = { DB: db, IP_HASH_KEY: "test-key" };
  return { env: value, calls };
}

const VALID = { platform: "web", record: finishedRecord() };

describe("worker fetch", () => {
  it("answers OPTIONS with 204 and CORS", async () => {
    const response = await worker.fetch(
      new Request("https://api.test/runs", { method: "OPTIONS" }),
      env().env,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("stores a valid run with 201 and never binds the raw IP", async () => {
    const { env: e, calls } = env();
    const response = await worker.fetch(post(VALID), e);
    expect(response.status).toBe(201);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(calls.map((c) => c.sql.split(/\s+/)[0])).toEqual(["SELECT", "INSERT", "INSERT"]);
    expect(calls[2]!.sql).toContain("INSERT INTO bests");
    expect(calls[2]!.values).toEqual([VALID.record.id, VALID.record.installId]);
    expect(JSON.stringify(calls)).not.toContain(IP);
    expect(calls[1]!.values[9]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses uploads without the IP hash key", async () => {
    const { db, calls } = fakeDb();
    expect((await worker.fetch(post(VALID), { DB: db })).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("rejects oversize, malformed and invalid bodies", async () => {
    const { env: e, calls } = env();
    expect((await worker.fetch(post(null, "x".repeat(70_000)), e)).status).toBe(413);
    const declared = new Request("https://api.test/runs", {
      method: "POST",
      headers: { "Content-Length": "999999" },
      body: "{}",
    });
    expect((await worker.fetch(declared, e)).status).toBe(413);
    expect((await worker.fetch(post(null, "{not json"), e)).status).toBe(400);
    expect((await worker.fetch(post({ platform: "web", record: {} }), e)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("rate limits without writing", async () => {
    const { env: e, calls } = env(RATE_LIMIT_MAX);
    expect((await worker.fetch(post(VALID), e)).status).toBe(429);
    expect(calls.map((c) => c.sql.split(/\s+/)[0])).toEqual(["SELECT"]);
  });

  it("returns 404 for other paths and 405 for other methods", async () => {
    const e = env().env;
    expect((await worker.fetch(new Request("https://api.test/other"), e)).status).toBe(404);
    expect((await worker.fetch(new Request("https://api.test/runs"), e)).status).toBe(405);
    expect((await worker.fetch(new Request("https://api.test/constructor"), e)).status).toBe(404);
    const postScores = new Request("https://api.test/scores", { method: "POST", body: "{}" });
    expect((await worker.fetch(postScores, e)).status).toBe(405);
  });

  it("serves the board, marks the requester's row and never exposes ids", async () => {
    const other = "33333333-3333-4333-8333-333333333333";
    const board: BoardDbRow[] = [
      {
        install_id: other,
        pellets: 900,
        reach: 10,
        country: "CA",
        received_at: "2026-10-12T02:00:00.000Z",
      },
      {
        install_id: INSTALL_ID,
        pellets: 500,
        reach: 3,
        country: "US",
        received_at: "2026-10-12T01:00:00.000Z",
      },
    ];
    const { env: e, calls } = env(0, board);
    const response = await worker.fetch(
      new Request(`https://api.test/scores?installId=${INSTALL_ID}`),
      e,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const text = await response.text();
    expect(text).not.toContain(INSTALL_ID);
    expect(text).not.toContain(other);
    expect(JSON.parse(text)).toEqual({
      scores: [
        {
          pellets: 900,
          reach: 10,
          country: "CA",
          receivedAt: "2026-10-12",
          mine: false,
        },
        {
          pellets: 500,
          reach: 3,
          country: "US",
          receivedAt: "2026-10-12",
          mine: true,
        },
      ],
    });
    expect(calls).toEqual([{ sql: expect.stringContaining("FROM bests"), values: [BOARD_LIMIT] }]);
  });

  it("serves the board without a requester when the install id is missing or malformed", async () => {
    const board: BoardDbRow[] = [
      {
        install_id: INSTALL_ID,
        pellets: 1,
        reach: 1,
        country: "XX",
        received_at: "2026-10-12T01:00:00.000Z",
      },
    ];
    for (const query of ["", "?installId=nope"]) {
      const response = await worker.fetch(
        new Request(`https://api.test/scores${query}`),
        env(0, board).env,
      );
      expect(((await response.json()) as { scores: { mine: boolean }[] }).scores[0]!.mine).toBe(
        false,
      );
    }
  });

  it("returns 500 when the database throws", async () => {
    const broken = {
      prepare() {
        throw new Error("down");
      },
    } as unknown as D1Database;
    const response = await worker.fetch(post(VALID), { DB: broken, IP_HASH_KEY: "k" });
    expect(response.status).toBe(500);
  });
});
