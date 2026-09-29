import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { anyKeyHeld, applyHeldKeys, combineAxisDirections, NO_KEYS_HELD } from "./heldKeys";

const none = { direction: DIRECTION.none, time: -1 };

describe("combineAxisDirections", () => {
  it("returns none when neither axis is held", () => {
    expect(combineAxisDirections(none, none, true)).toBe(DIRECTION.none);
    expect(combineAxisDirections(none, none, false)).toBe(DIRECTION.none);
  });

  it("returns the single held axis regardless of diagonalAllowed", () => {
    const up = { direction: DIRECTION.up, time: 10 };
    expect(combineAxisDirections(up, none, true)).toBe(DIRECTION.up);
    expect(combineAxisDirections(up, none, false)).toBe(DIRECTION.up);

    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(none, left, true)).toBe(DIRECTION.left);
    expect(combineAxisDirections(none, left, false)).toBe(DIRECTION.left);
  });

  it("combines both axes into a diagonal when allowed", () => {
    const up = { direction: DIRECTION.up, time: 5 };
    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(up, left, true)).toBe(DIRECTION.upLeft);

    const down = { direction: DIRECTION.down, time: 5 };
    const right = { direction: DIRECTION.right, time: 10 };
    expect(combineAxisDirections(down, right, true)).toBe(DIRECTION.downRight);
    expect(combineAxisDirections(up, right, true)).toBe(DIRECTION.upRight);
    expect(combineAxisDirections(down, left, true)).toBe(DIRECTION.downLeft);
  });

  it("falls back to the most-recently-pressed single axis when diagonal is not allowed", () => {
    const up = { direction: DIRECTION.up, time: 5 };
    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(up, left, false)).toBe(DIRECTION.left);

    const laterUp = { direction: DIRECTION.up, time: 15 };
    expect(combineAxisDirections(laterUp, left, false)).toBe(DIRECTION.up);
  });
});

function playerWorld() {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Input);
  Input.direction[eid] = DIRECTION.none;
  return { world, eid };
}

describe("applyHeldKeys", () => {
  it("keeps the sticky direction when nothing is held", () => {
    const { world, eid } = playerWorld();
    Input.direction[eid] = DIRECTION.left;
    applyHeldKeys(world, NO_KEYS_HELD);
    expect(Input.direction[eid]).toBe(DIRECTION.left);
  });

  it("clears the direction on release only with stopOnRelease", () => {
    const { world, eid } = playerWorld();
    Input.direction[eid] = DIRECTION.left;
    applyHeldKeys(world, NO_KEYS_HELD, { stopOnRelease: true });
    expect(Input.direction[eid]).toBe(DIRECTION.none);
  });

  it("picks the most recently pressed key, later axis on ties", () => {
    const { world, eid } = playerWorld();
    applyHeldKeys(world, { ...NO_KEYS_HELD, up: 5, left: 9 });
    expect(Input.direction[eid]).toBe(DIRECTION.left);
    applyHeldKeys(world, { ...NO_KEYS_HELD, up: 7, down: 7 });
    expect(Input.direction[eid]).toBe(DIRECTION.down);
  });

  it("combines perpendicular keys into a diagonal when allowed", () => {
    const { world, eid } = playerWorld();
    applyHeldKeys(world, { ...NO_KEYS_HELD, up: 1, right: 2 }, { diagonalAllowed: true });
    expect(Input.direction[eid]).toBe(DIRECTION.upRight);
  });
});

describe("anyKeyHeld", () => {
  it("is true when any direction has a press time", () => {
    expect(anyKeyHeld(NO_KEYS_HELD)).toBe(false);
    expect(anyKeyHeld({ ...NO_KEYS_HELD, right: 0 })).toBe(true);
  });
});
