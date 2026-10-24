import { describe, expect, it } from "vitest";
import { GHOST_AI_MODE } from "../../../domain/ghostMode";
import { classifyDeath, type DeathObservation, type PlanVerdict } from "./bot";

const plan: PlanVerdict = {
  survivable: true,
  mistake: false,
  missedTurn: false,
  mode: GHOST_AI_MODE.chase,
  ghostKinds: new Set(["blinky", "pinky"]),
};

const now: DeathObservation = {
  mode: GHOST_AI_MODE.chase,
  killer: "blinky",
  exactSurvives: () => false,
};

describe("classifyDeath", () => {
  it("is cornered when the last plan had no surviving route", () => {
    expect(classifyDeath({ ...plan, survivable: false }, now)).toBe("cornered");
  });

  it("is execution when a missed press left no way out, or on a deliberate wrong turn", () => {
    expect(classifyDeath({ ...plan, survivable: false, missedTurn: true }, now)).toBe("execution");
    expect(classifyDeath({ ...plan, mistake: true }, now)).toBe("execution");
  });

  it("is horizon when the mode flipped or the killer was not in the plan", () => {
    expect(classifyDeath(plan, { ...now, mode: GHOST_AI_MODE.scatter })).toBe("horizon");
    expect(classifyDeath(plan, { ...now, killer: "clyde" })).toBe("horizon");
  });

  it("splits model from reaction by re-planning with exact ghost positions", () => {
    expect(classifyDeath(plan, { ...now, exactSurvives: () => true })).toBe("model");
    expect(classifyDeath(plan, now)).toBe("reaction");
  });

  it("does not re-plan when an earlier rule already decided", () => {
    let replanned = false;
    const exactSurvives = () => {
      replanned = true;
      return true;
    };
    classifyDeath({ ...plan, mistake: true }, { ...now, exactSurvives });
    expect(replanned).toBe(false);
  });
});
