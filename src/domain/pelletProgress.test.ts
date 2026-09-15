import { describe, expect, it } from "vitest";
import { applyPelletCollect, createPelletProgress } from "./pelletProgress";

describe("applyPelletCollect", () => {
  it("ignores zero removals", () => {
    const progress = createPelletProgress(3);
    expect(applyPelletCollect(progress, 0)).toEqual({
      progress,
      shouldRecordClear: false,
    });
  });

  it("decrements remaining and accumulates collected", () => {
    const progress = createPelletProgress(3);
    const next = applyPelletCollect(progress, 2);
    expect(next).toEqual({
      progress: { collectedCount: 2, pelletsRemaining: 1, runRecorded: false },
      shouldRecordClear: false,
    });
  });

  it("signals a clear once when remaining hits 0 after a collect", () => {
    const progress = createPelletProgress(2);
    const first = applyPelletCollect(progress, 2);
    expect(first.shouldRecordClear).toBe(true);
    expect(first.progress).toEqual({
      collectedCount: 2,
      pelletsRemaining: 0,
      runRecorded: true,
    });

    const second = applyPelletCollect(first.progress, 0);
    expect(second.shouldRecordClear).toBe(false);
    expect(second.progress.runRecorded).toBe(true);
  });

  it("does not record a clear when the maze started empty", () => {
    const progress = createPelletProgress(0);
    expect(applyPelletCollect(progress, 0).shouldRecordClear).toBe(false);
  });
});
