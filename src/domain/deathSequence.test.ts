import { describe, expect, it } from "vitest";
import {
  DEATH_FADE_DURATION_MS,
  DEATH_HOLD_MS,
  GAME_OVER_HOLD_MS,
  READY_PAUSE_MS,
  beginDeathSequence,
  tickDeathSequence,
} from "./deathSequence";

describe("tickDeathSequence", () => {
  it("stays in hold before the death hold threshold", () => {
    const tick = tickDeathSequence(beginDeathSequence(false), DEATH_HOLD_MS - 1);
    expect(tick.events).toEqual([]);
    expect(tick.state.phase).toBe("hold");
    expect(tick.state.phaseElapsedMs).toBe(DEATH_HOLD_MS - 1);
  });

  it("non-final: emits resetActors then enters ready at hold threshold", () => {
    const tick = tickDeathSequence(beginDeathSequence(false), DEATH_HOLD_MS);
    expect(tick.events).toEqual(["resetActors"]);
    expect(tick.state).toEqual({
      gameOver: false,
      phase: "ready",
      phaseElapsedMs: 0,
    });
  });

  it("non-final: emits resume after ready pause", () => {
    const afterHold = tickDeathSequence(beginDeathSequence(false), DEATH_HOLD_MS);
    const tick = tickDeathSequence(afterHold.state, READY_PAUSE_MS);
    expect(tick.events).toEqual(["resume"]);
    expect(tick.state.phase).toBe("doneResume");
  });

  it("non-final: large delta emits resetActors before resume in order", () => {
    const tick = tickDeathSequence(beginDeathSequence(false), DEATH_HOLD_MS + READY_PAUSE_MS + 250);
    expect(tick.events).toEqual(["resetActors", "resume"]);
    expect(tick.state.phase).toBe("doneResume");
  });

  it("final: emits startFade after hold, never resetActors or resume", () => {
    const tick = tickDeathSequence(beginDeathSequence(true), DEATH_HOLD_MS);
    expect(tick.events).toEqual(["startFade"]);
    expect(tick.state.phase).toBe("fadeToGameOver");
    expect(tick.events).not.toContain("resetActors");
    expect(tick.events).not.toContain("resume");
  });

  it("final: showGameOver after fade, then goToMenu after hold", () => {
    let state = beginDeathSequence(true);
    let tick = tickDeathSequence(state, DEATH_HOLD_MS);
    state = tick.state;
    tick = tickDeathSequence(state, DEATH_FADE_DURATION_MS);
    expect(tick.events).toEqual(["showGameOver"]);
    expect(tick.state.phase).toBe("gameOver");
    tick = tickDeathSequence(tick.state, GAME_OVER_HOLD_MS);
    expect(tick.events).toEqual(["goToMenu"]);
    expect(tick.state.phase).toBe("doneMenu");
  });

  it("final: large delta emits startFade, showGameOver, goToMenu in order", () => {
    const tick = tickDeathSequence(
      beginDeathSequence(true),
      DEATH_HOLD_MS + DEATH_FADE_DURATION_MS + GAME_OVER_HOLD_MS + 100,
    );
    expect(tick.events).toEqual(["startFade", "showGameOver", "goToMenu"]);
    expect(tick.state.phase).toBe("doneMenu");
  });

  it("terminal phases emit no further events", () => {
    const resumed = tickDeathSequence(beginDeathSequence(false), DEATH_HOLD_MS + READY_PAUSE_MS);
    expect(tickDeathSequence(resumed.state, 500).events).toEqual([]);
    const menu = tickDeathSequence(
      beginDeathSequence(true),
      DEATH_HOLD_MS + DEATH_FADE_DURATION_MS + GAME_OVER_HOLD_MS,
    );
    expect(tickDeathSequence(menu.state, 500).events).toEqual([]);
  });
});
