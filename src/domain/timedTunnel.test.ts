import { describe, expect, it } from "vitest";
import {
  pickTimedTunnelRow,
  TIMED_TUNNEL_CLOSED_MS,
  TIMED_TUNNEL_CYCLE_MS,
  TIMED_TUNNEL_OPEN_MS,
  TIMED_TUNNEL_WARN_MS,
  timedTunnelBlocksWrap,
  timedTunnelMouthBlinkOn,
  timedTunnelPhase,
  timedTunnelPhaseRemainingMs,
} from "./timedTunnel";

describe("timedTunnelPhase", () => {
  it("is open before the warn window", () => {
    expect(timedTunnelPhase(0)).toBe("open");
    expect(timedTunnelPhase(TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS - 1)).toBe("open");
  });

  it("is warn for the last 1.5s of open", () => {
    expect(timedTunnelPhase(TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS)).toBe("warn");
    expect(timedTunnelPhase(TIMED_TUNNEL_OPEN_MS - 1)).toBe("warn");
  });

  it("is closed after open ends", () => {
    expect(timedTunnelPhase(TIMED_TUNNEL_OPEN_MS)).toBe("closed");
    expect(timedTunnelPhase(TIMED_TUNNEL_OPEN_MS + TIMED_TUNNEL_CLOSED_MS - 1)).toBe("closed");
  });

  it("wraps the cycle", () => {
    expect(timedTunnelPhase(TIMED_TUNNEL_CYCLE_MS)).toBe("open");
    expect(
      timedTunnelPhase(TIMED_TUNNEL_CYCLE_MS + TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS),
    ).toBe("warn");
  });
});

describe("timedTunnelPhaseRemainingMs", () => {
  it("counts down within each phase", () => {
    expect(timedTunnelPhaseRemainingMs(0)).toBe(TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS);
    expect(timedTunnelPhaseRemainingMs(TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS)).toBe(
      TIMED_TUNNEL_WARN_MS,
    );
    expect(timedTunnelPhaseRemainingMs(TIMED_TUNNEL_OPEN_MS)).toBe(TIMED_TUNNEL_CLOSED_MS);
  });
});

describe("pickTimedTunnelRow", () => {
  it("returns null for an empty list", () => {
    expect(pickTimedTunnelRow([], () => 0.9)).toBeNull();
  });

  it("returns the only row without rolling", () => {
    expect(
      pickTimedTunnelRow([12], () => {
        throw new Error("should not roll");
      }),
    ).toBe(12);
  });

  it("picks by floor(next * length)", () => {
    expect(pickTimedTunnelRow([3, 9, 15], () => 0)).toBe(3);
    expect(pickTimedTunnelRow([3, 9, 15], () => 0.5)).toBe(9);
    expect(pickTimedTunnelRow([3, 9, 15], () => 0.99)).toBe(15);
  });
});

describe("timedTunnelBlocksWrap", () => {
  const base = {
    phase: "closed" as const,
    gatedRow: 14,
    entityRow: 14,
    wallPassLoopActive: false,
  };

  it("blocks only when closed on the gated row", () => {
    expect(timedTunnelBlocksWrap(base)).toBe(true);
    expect(timedTunnelBlocksWrap({ ...base, phase: "open" })).toBe(false);
    expect(timedTunnelBlocksWrap({ ...base, phase: "warn" })).toBe(false);
    expect(timedTunnelBlocksWrap({ ...base, entityRow: 10 })).toBe(false);
    expect(timedTunnelBlocksWrap({ ...base, gatedRow: null })).toBe(false);
  });

  it("never blocks while Wall Pass+ loop is active", () => {
    expect(timedTunnelBlocksWrap({ ...base, wallPassLoopActive: true })).toBe(false);
  });
});

describe("timedTunnelMouthBlinkOn", () => {
  it("blinks only during warn", () => {
    expect(timedTunnelMouthBlinkOn("warn", 0)).toBe(true);
    expect(timedTunnelMouthBlinkOn("warn", 100)).toBe(false);
    expect(timedTunnelMouthBlinkOn("open", 0)).toBe(false);
    expect(timedTunnelMouthBlinkOn("closed", 0)).toBe(false);
  });
});
