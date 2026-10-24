export type StickDirection = "up" | "down" | "left" | "right";
export type StickPoint = { x: number; y: number };

export const TOUCH_STICK_DEADZONE = 8;
export const TOUCH_STICK_RADIUS = 28;

export function stickDirection(
  origin: StickPoint,
  finger: StickPoint,
  deadzone = TOUCH_STICK_DEADZONE,
): StickDirection | null {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  if (Math.hypot(dx, dy) < deadzone) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "up" : "down";
}

export function followStickOrigin(
  origin: StickPoint,
  finger: StickPoint,
  radius = TOUCH_STICK_RADIUS,
): StickPoint {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) {
    return origin;
  }
  const pull = (distance - radius) / distance;
  return { x: origin.x + dx * pull, y: origin.y + dy * pull };
}
