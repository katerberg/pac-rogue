export const EXPIRY_BLINK_MS = 100;
export const EXPIRY_URGENCY_MS = 1000;

export function expiryTintOn(remainingMs: number, nowMs: number): boolean {
  return (
    remainingMs > 0 &&
    (remainingMs > EXPIRY_URGENCY_MS || Math.floor(nowMs / EXPIRY_BLINK_MS) % 2 === 0)
  );
}
