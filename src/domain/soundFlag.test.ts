import { describe, expect, it } from "vitest";
import ports from "../../scripts/ports.json";
import { isAgentPort, isSoundEnabled } from "./soundFlag";

describe("isAgentPort", () => {
  it("matches agent dev and preview ports", () => {
    expect(isAgentPort(String(ports.agentDev))).toBe(true);
    expect(isAgentPort(String(ports.agentPreview))).toBe(true);
  });

  it("rejects human ports and empty", () => {
    expect(isAgentPort(String(ports.humanDev))).toBe(false);
    expect(isAgentPort(String(ports.humanPreview))).toBe(false);
    expect(isAgentPort("")).toBe(false);
  });
});

describe("isSoundEnabled", () => {
  it("stays on for human ports even without a flag", () => {
    expect(isSoundEnabled(new URLSearchParams(), String(ports.humanDev))).toBe(true);
    expect(isSoundEnabled(new URLSearchParams("sound=0"), String(ports.humanPreview))).toBe(true);
  });

  it("is off on agent ports by default", () => {
    expect(isSoundEnabled(new URLSearchParams(), String(ports.agentDev))).toBe(false);
    expect(isSoundEnabled(new URLSearchParams(), String(ports.agentPreview))).toBe(false);
  });

  it("turns on for agent ports only with sound=1", () => {
    expect(isSoundEnabled(new URLSearchParams("sound=1"), String(ports.agentDev))).toBe(true);
    expect(isSoundEnabled(new URLSearchParams("sound=true"), String(ports.agentPreview))).toBe(
      false,
    );
    expect(isSoundEnabled(new URLSearchParams("sound=0"), String(ports.agentDev))).toBe(false);
  });
});
