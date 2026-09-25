import { describe, expect, it } from "vitest";
import { queuePelletRefills, tickPelletRefills } from "./learnPelletRefill";

describe("queuePelletRefills", () => {
  it("appends entries with the given delay", () => {
    const pending = queuePelletRefills(
      [],
      [
        { x: 1, y: 2, kind: "dot" },
        { x: 3, y: 4, kind: "power" },
      ],
      5000,
    );
    expect(pending).toEqual([
      { x: 1, y: 2, kind: "dot", remainingMs: 5000 },
      { x: 3, y: 4, kind: "power", remainingMs: 5000 },
    ]);
  });

  it("is a no-op for an empty position list", () => {
    const pending = [{ x: 0, y: 0, kind: "dot" as const, remainingMs: 100 }];
    expect(queuePelletRefills(pending, [], 5000)).toEqual(pending);
  });
});

describe("tickPelletRefills", () => {
  it("counts down and keeps entries not yet ready", () => {
    const pending = queuePelletRefills([], [{ x: 1, y: 2, kind: "dot" }], 1000);
    const result = tickPelletRefills(pending, 400);
    expect(result.ready).toEqual([]);
    expect(result.pending).toEqual([{ x: 1, y: 2, kind: "dot", remainingMs: 600 }]);
  });

  it("fires ready entries once their timer reaches zero", () => {
    const pending = queuePelletRefills([], [{ x: 1, y: 2, kind: "power" }], 500);
    const result = tickPelletRefills(pending, 500);
    expect(result.pending).toEqual([]);
    expect(result.ready).toEqual([{ x: 1, y: 2, kind: "power" }]);
  });

  it("fires an entry whose delta overshoots its remaining time", () => {
    const pending = queuePelletRefills([], [{ x: 1, y: 2, kind: "dot" }], 100);
    const result = tickPelletRefills(pending, 1000);
    expect(result.pending).toEqual([]);
    expect(result.ready).toEqual([{ x: 1, y: 2, kind: "dot" }]);
  });
});
