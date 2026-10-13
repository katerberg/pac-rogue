import type { UpgradeSchool } from "../../../domain/upgrades";

export type PersonaId = "cautious" | "speedrunner" | "disrupter" | "collector" | "casual";
export type SkillTierId = "novice" | "average" | "expert";

export type MoveWeights = {
  pellet: number;
  ghostFear: number;
  fearRadiusTiles: number;
  powerSeek: number;
  powerHoldNearGhosts: boolean;
  frightChase: number;
  fruit: number;
  streak: number;
  tunnel: number;
  noise: number;
};

export type StorePolicy = {
  lifeAtOrBelow: number;
  enhance: boolean;
  reserveQuarters: number;
  maxPurchases: number;
};

export type Persona = {
  id: PersonaId;
  weights: MoveWeights;
  schoolPreference: Record<UpgradeSchool, number>;
  randomPicks: boolean;
  mistakeMul: number;
  store: StorePolicy;
};

export type SkillTier = {
  id: SkillTierId;
  reactionMs: number;
  jitterMs: number;
  mistakeRate: number;
};

export type Profile = { id: string; persona: Persona; skill: SkillTier };

const NEUTRAL_PREFERENCE: Record<UpgradeSchool, number> = {
  death: 0.5,
  harvest: 0.5,
  speed: 0.5,
  automation: 0.5,
  protection: 0.5,
  disruption: 0.5,
  neutral: 0.5,
};

const BASE_WEIGHTS: MoveWeights = {
  pellet: 1,
  ghostFear: 3,
  fearRadiusTiles: 5,
  powerSeek: 0.3,
  powerHoldNearGhosts: false,
  frightChase: 0,
  fruit: 0.3,
  streak: 0,
  tunnel: 0.3,
  noise: 0,
};

const BASE_STORE: StorePolicy = {
  lifeAtOrBelow: 1,
  enhance: false,
  reserveQuarters: 0,
  maxPurchases: Number.POSITIVE_INFINITY,
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: {
    id: "cautious",
    weights: { ...BASE_WEIGHTS, ghostFear: 6, fearRadiusTiles: 6, powerSeek: 0.6, tunnel: 0.6 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, protection: 2, death: 1.5 },
    randomPicks: false,
    mistakeMul: 1,
    store: { ...BASE_STORE, lifeAtOrBelow: 2 },
  },
  speedrunner: {
    id: "speedrunner",
    weights: { ...BASE_WEIGHTS, pellet: 2, ghostFear: 1.5, fearRadiusTiles: 3, fruit: 0.1 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, speed: 2, automation: 1.5 },
    randomPicks: false,
    mistakeMul: 1,
    store: { ...BASE_STORE, lifeAtOrBelow: 0 },
  },
  disrupter: {
    id: "disrupter",
    weights: { ...BASE_WEIGHTS, powerSeek: 1, powerHoldNearGhosts: true, frightChase: 2 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, disruption: 2 },
    randomPicks: false,
    mistakeMul: 1,
    store: BASE_STORE,
  },
  collector: {
    id: "collector",
    weights: { ...BASE_WEIGHTS, fruit: 2, streak: 1 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, harvest: 2, automation: 1.5 },
    randomPicks: false,
    mistakeMul: 1,
    store: { ...BASE_STORE, enhance: true },
  },
  casual: {
    id: "casual",
    weights: { ...BASE_WEIGHTS, ghostFear: 2.5, noise: 0.4 },
    schoolPreference: NEUTRAL_PREFERENCE,
    randomPicks: true,
    mistakeMul: 2,
    store: { ...BASE_STORE, maxPurchases: 1 },
  },
};

const SKILL_TIERS: Record<SkillTierId, SkillTier> = {
  novice: { id: "novice", reactionMs: 250, jitterMs: 100, mistakeRate: 0.02 },
  average: { id: "average", reactionMs: 180, jitterMs: 50, mistakeRate: 0.005 },
  expert: { id: "expert", reactionMs: 100, jitterMs: 15, mistakeRate: 0 },
};

export const PROFILE_IDS: readonly string[] = [
  "cautious@average",
  "speedrunner@average",
  "disrupter@average",
  "collector@average",
  "casual@average",
  "cautious@novice",
  "cautious@expert",
  "casual@novice",
  "casual@expert",
];

export const AVERAGE_PROFILE_IDS: readonly string[] = PROFILE_IDS.filter((id) =>
  id.endsWith("@average"),
);

export function profileFor(id: string): Profile {
  const [personaId, tierId] = id.split("@");
  const persona = PERSONAS[personaId as PersonaId];
  const skill = SKILL_TIERS[tierId as SkillTierId];
  if (persona === undefined || skill === undefined) {
    throw new Error(`Unknown bot profile "${id}"; expected <persona>@<novice|average|expert>`);
  }
  return { id, persona, skill };
}
