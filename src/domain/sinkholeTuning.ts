export type SinkholeTuning = {
  readonly sinkholeArtTile: number;
  readonly sinkholeBulge: number;
  readonly sinkholeTaper: number;
  readonly sinkholeJag: number;
  readonly sinkholeJagScale: number;
  readonly sinkholeLumps: number;
  readonly sinkholeLumpScale: number;
  readonly sinkholeRimWidth: number;
  readonly sinkholeBandWidth: number;
  readonly sinkholeEdgeDarken: number;
  readonly sinkholeVoidColor: number;
  readonly sinkholeIntroMs: number;
  readonly sinkholeCrackShare: number;
  readonly sinkholeSpread: number;
  readonly sinkholeSlitWobble: number;
  readonly sinkholeSlitWobbleScale: number;
  readonly sinkholeSlitThick: number;
};

export const DEFAULT_SINKHOLE_TUNING: SinkholeTuning = {
  sinkholeArtTile: 9,
  sinkholeBulge: -0.6,
  sinkholeTaper: 0.65,
  sinkholeJag: 2,
  sinkholeJagScale: 5.7,
  sinkholeLumps: 1.795,
  sinkholeLumpScale: 1.5,
  sinkholeRimWidth: 1.6,
  sinkholeBandWidth: 0.8,
  sinkholeEdgeDarken: 0.6,
  sinkholeVoidColor: 0x000000,
  sinkholeIntroMs: 4000,
  sinkholeCrackShare: 0.4,
  sinkholeSpread: 0.4,
  sinkholeSlitWobble: 1.7,
  sinkholeSlitWobbleScale: 1.2,
  sinkholeSlitThick: 0.5,
};

export function sameSinkholeTuning(a: SinkholeTuning, b: SinkholeTuning): boolean {
  return (Object.keys(DEFAULT_SINKHOLE_TUNING) as (keyof SinkholeTuning)[]).every(
    (key) => a[key] === b[key],
  );
}
