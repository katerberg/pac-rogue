import { describe, expect, it } from "vitest";
import worker, { type Env } from "./index";
import { RATE_LIMIT_MAX } from "./runs";
import { finishedRecord } from "./testRecord";

type Call = { sql: string; values: unknown[] };

function fakeDb(recentCount = 0) {
  const calls: Call[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            first: async () => ({ n: recentCount }),
            run: async () => ({ success: true }),
          };
        },
      };
    },
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

function env(recentCount = 0) {
  const { db, calls } = fakeDb(recentCount);
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
    expect(calls.map((c) => c.sql.split(/\s+/)[0])).toEqual(["SELECT", "INSERT"]);
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
