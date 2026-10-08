import { describe, expect, it } from "vitest";
import {
  BOSS_STAGE_ENTITY_FADE_MS,
  BOSS_STAGE_FLICKER_MS,
  BOSS_STAGE_FLICKER_PULSE_MS,
  createBossStageTransition,
  tickBossStageTransition,
} from "./bossStageTransition";

describe("tickBossStageTransition", () => {
  it("fades entities out first while walls stay solid", () => {
    const mid = tickBossStageTransition(createBossStageTransition(), BOSS_STAGE_ENTITY_FADE_MS / 2);
    expect(mid.phase).toBe("entityFadeOut");
    expect(mid.entityAlpha).toBeCloseTo(0.5);
    expect(mid.wallAlpha).toBe(1);
    expect(mid.timerGlitch).toBe(true);
    expect(mid.cutSuccessSfx).toBe(false);
  });

  it("flickers the maze out with deterministic 80ms pulses, then rebuilds and cuts success SFX", () => {
    let state = createBossStageTransition();
    state = tickBossStageTransition(state, BOSS_STAGE_ENTITY_FADE_MS).state;

    const firstPulse = tickBossStageTransition(state, 1);
    expect(firstPulse.phase).toBe("mazeFlickerOut");
    expect(firstPulse.entityAlpha).toBe(0);
    expect(firstPulse.wallAlpha).toBe(1);
    state = firstPulse.state;

    const offPulse = tickBossStageTransition(state, BOSS_STAGE_FLICKER_PULSE_MS);
    expect(offPulse.wallAlpha).toBe(0);
    state = offPulse.state;

    const rebuild = tickBossStageTransition(
      state,
      BOSS_STAGE_FLICKER_MS - state.elapsedMs + BOSS_STAGE_ENTITY_FADE_MS,
    );
    expect(rebuild.phase).toBe("rebuild");
    expect(rebuild.shouldRebuild).toBe(true);
    expect(rebuild.cutSuccessSfx).toBe(true);
    expect(rebuild.wallAlpha).toBe(0);
    expect(rebuild.entityAlpha).toBe(0);
  });

  it("flickers the maze back in, then fades entities while restarting gameplay music once", () => {
    let state = createBossStageTransition();
    const toRebuild = tickBossStageTransition(
      state,
      BOSS_STAGE_ENTITY_FADE_MS + BOSS_STAGE_FLICKER_MS,
    );
    expect(toRebuild.shouldRebuild).toBe(true);
    state = toRebuild.state;

    const flickerIn = tickBossStageTransition(state, 1);
    expect(flickerIn.phase).toBe("mazeFlickerIn");
    expect(flickerIn.entityAlpha).toBe(0);
    expect(flickerIn.wallAlpha).toBe(1);
    state = flickerIn.state;

    let musicStarts = 0;
    let fadeInSeen = false;
    for (let i = 0; i < 200; i += 1) {
      const tick = tickBossStageTransition(state, 16);
      state = tick.state;
      if (tick.startGameplayMusic) {
        musicStarts += 1;
      }
      if (tick.phase === "entityFadeIn") {
        fadeInSeen = true;
        expect(tick.wallAlpha).toBe(1);
        expect(tick.entityAlpha).toBeGreaterThan(0);
      }
      if (tick.done) {
        expect(fadeInSeen).toBe(true);
        expect(musicStarts).toBe(1);
        expect(tick.entityAlpha).toBe(1);
        expect(tick.wallAlpha).toBe(1);
        expect(tick.timerGlitch).toBe(false);
        return;
      }
    }
    throw new Error("transition never finished");
  });

  it("rebuilds on the first crossing of flicker-out, then reaches done on the next tick past total duration", () => {
    const total =
      BOSS_STAGE_ENTITY_FADE_MS +
      BOSS_STAGE_FLICKER_MS +
      BOSS_STAGE_FLICKER_MS +
      BOSS_STAGE_ENTITY_FADE_MS;
    const rebuild = tickBossStageTransition(createBossStageTransition(), total);
    expect(rebuild.phase).toBe("rebuild");
    expect(rebuild.shouldRebuild).toBe(true);
    expect(rebuild.cutSuccessSfx).toBe(true);
    expect(rebuild.startGameplayMusic).toBe(true);

    const done = tickBossStageTransition(rebuild.state, 0);
    expect(done.done).toBe(true);
    expect(done.phase).toBe("done");
    expect(done.startGameplayMusic).toBe(false);
    expect(done.shouldRebuild).toBe(false);
  });

  it("emits cut and music flags only once across many ticks", () => {
    let state = createBossStageTransition();
    let cuts = 0;
    let music = 0;
    let rebuilds = 0;
    for (let i = 0; i < 200; i += 1) {
      const tick = tickBossStageTransition(state, 20);
      state = tick.state;
      if (tick.cutSuccessSfx) {
        cuts += 1;
      }
      if (tick.startGameplayMusic) {
        music += 1;
      }
      if (tick.shouldRebuild) {
        rebuilds += 1;
      }
      if (tick.done) {
        break;
      }
    }
    expect(cuts).toBe(1);
    expect(music).toBe(1);
    expect(rebuilds).toBe(1);
  });
});
