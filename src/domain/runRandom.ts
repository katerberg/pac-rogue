import { randomFromSeed } from "./mazeTiling";

export type RandomStream =
  | "secondGhost"
  | "midStore"
  | "startingUpgrade"
  | "corruption"
  | "upgradeOffer"
  | "upgradeFx"
  | "storeStock"
  | "storePurchase"
  | "pelletToPower"
  | "fruitPowerConvert"
  | "bossScatter"
  | "bossShake";

export type RunRandom = {
  seed: string;
  stream: (name: RandomStream, level?: number) => () => number;
};

const SEED_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function parseSeedParam(params: URLSearchParams): string | null {
  const raw = params.get("seed");
  return raw !== null && SEED_PATTERN.test(raw) ? raw : null;
}

export function freshSeed(): string {
  return Math.floor(Math.random() * 36 ** 8)
    .toString(36)
    .padStart(8, "0");
}

export function createRunRandom(seed: string): RunRandom {
  const streams = new Map<string, () => number>();
  return {
    seed,
    stream: (name, level) => {
      const key = level === undefined ? name : `${name}@${level}`;
      let next = streams.get(key);
      if (next === undefined) {
        next = randomFromSeed(`${key}:${seed}`);
        streams.set(key, next);
      }
      return next;
    },
  };
}
