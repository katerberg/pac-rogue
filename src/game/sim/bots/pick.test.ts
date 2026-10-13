import { describe, expect, it } from "vitest";
import { createRunRandom } from "../../../domain/runRandom";
import { pickOffer } from "./pick";
import { PERSONAS, type Persona } from "./profiles";

const offer = {
  quarters: 2,
  upgrades: ["passiveAfterburner", "powerPelletInvuln", "fruitFeast"] as const,
  enhanced: [],
};

describe("pickOffer", () => {
  it("takes the persona's preferred school", () => {
    const rng = createRunRandom("pick").stream("bot");
    expect(
      pickOffer({ ...offer, upgrades: [...offer.upgrades] }, [], PERSONAS.cautious, rng),
    ).toEqual({
      kind: "upgrade",
      id: "powerPelletInvuln",
      enhanced: false,
    });
    expect(
      pickOffer({ ...offer, upgrades: [...offer.upgrades] }, [], PERSONAS.speedrunner, rng),
    ).toMatchObject({
      id: "passiveAfterburner",
    });
  });

  it("covers every option when picking at random", () => {
    const rng = createRunRandom("random-picks").stream("bot");
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const choice = pickOffer(
        { ...offer, upgrades: [...offer.upgrades] },
        [],
        PERSONAS.casual,
        rng,
      );
      seen.add(choice.kind === "upgrade" ? choice.id : "quarters");
    }
    expect(seen.size).toBe(4);
  });

  it("banks Quarters when nothing scores above zero", () => {
    const rng = createRunRandom("quarters").stream("bot");
    const sour: Persona = {
      ...PERSONAS.cautious,
      schoolPreference: Object.fromEntries(
        Object.keys(PERSONAS.cautious.schoolPreference).map((school) => [school, -1]),
      ) as Persona["schoolPreference"],
    };
    expect(pickOffer({ ...offer, upgrades: [...offer.upgrades] }, [], sour, rng)).toEqual({
      kind: "quarters",
      amount: 2,
    });
  });
});
