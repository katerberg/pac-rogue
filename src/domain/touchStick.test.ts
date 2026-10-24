import { describe, expect, it } from "vitest";
import {
  followStickOrigin,
  stickDirection,
  TOUCH_STICK_DEADZONE,
  TOUCH_STICK_RADIUS,
} from "./touchStick";

const origin = { x: 100, y: 100 };

describe("stickDirection", () => {
  it("holds no direction inside the deadzone", () => {
    expect(stickDirection(origin, { x: 100 + TOUCH_STICK_DEADZONE - 1, y: 100 })).toBeNull();
  });

  it("picks the dominant axis past the deadzone", () => {
    expect(stickDirection(origin, { x: 80, y: 95 })).toBe("left");
    expect(stickDirection(origin, { x: 120, y: 110 })).toBe("right");
    expect(stickDirection(origin, { x: 95, y: 80 })).toBe("up");
    expect(stickDirection(origin, { x: 105, y: 120 })).toBe("down");
  });

  it("breaks an exact diagonal tie toward the vertical axis", () => {
    expect(stickDirection(origin, { x: 120, y: 120 })).toBe("down");
  });
});

describe("followStickOrigin", () => {
  it("keeps the origin while the finger stays inside the ring", () => {
    expect(followStickOrigin(origin, { x: 100 + TOUCH_STICK_RADIUS, y: 100 })).toBe(origin);
  });

  it("drags the origin so the finger sits on the ring edge", () => {
    const next = followStickOrigin(origin, { x: 100 + TOUCH_STICK_RADIUS + 50, y: 100 });
    expect(next).toEqual({ x: 150, y: 100 });
  });

  it("reverses within a ring plus deadzone of travel after a long drag", () => {
    const dragged = followStickOrigin(origin, { x: 300, y: 100 });
    const back = { x: 300 - TOUCH_STICK_RADIUS - TOUCH_STICK_DEADZONE, y: 100 };
    expect(stickDirection(dragged, back)).toBe("left");
  });
});
