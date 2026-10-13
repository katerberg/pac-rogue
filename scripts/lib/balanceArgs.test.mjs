import { describe, expect, it } from "vitest";
import { parseBalanceArgs, runDirName } from "./balanceArgs.mjs";

describe("parseBalanceArgs", () => {
  it("defaults to the full preset with a 6 hour budget", () => {
    const options = parseBalanceArgs([], 9);
    expect(options).toMatchObject({ mode: "run", preset: "full", budgetHours: 6, workers: 9 });
    expect(options.only).toEqual(["builds", "singles", "pairs", "schools", "enemies"]);
  });

  it("gives pilot a 30 minute budget and smoke no budget", () => {
    expect(parseBalanceArgs(["--preset", "pilot"], 3).budgetHours).toBe(0.5);
    expect(parseBalanceArgs(["--preset", "smoke"], 3).budgetHours).toBeNull();
  });

  it("parses lists, flags and numbers", () => {
    const options = parseBalanceArgs(
      ["--only", "builds,pairs", "--profiles", "cautious@expert", "--workers", "4", "--dry-run"],
      9,
    );
    expect(options).toMatchObject({
      only: ["builds", "pairs"],
      profiles: ["cautious@expert"],
      workers: 4,
      dryRun: true,
    });
  });

  it("rejects unknown experiments, options and smoke budgets", () => {
    expect(() => parseBalanceArgs(["--only", "boss"], 1)).toThrow(/unknown boss/);
    expect(() => parseBalanceArgs(["--fast"], 1)).toThrow(/Unknown option/);
    expect(() => parseBalanceArgs(["--preset", "smoke", "--budget-hours", "1"], 1)).toThrow(
      /fixed size/,
    );
  });

  it("parses compare and worker modes", () => {
    expect(parseBalanceArgs(["--compare", "a", "b"], 1)).toEqual({
      mode: "compare",
      before: "a",
      after: "b",
    });
    expect(parseBalanceArgs(["--worker", "x.mjs"], 1)).toEqual({ mode: "worker", bundle: "x.mjs" });
  });
});

describe("runDirName", () => {
  it("stamps the local date and preset", () => {
    expect(runDirName(new Date(2026, 9, 3, 7, 5), "pilot")).toBe("20261003-0705-pilot");
  });
});
