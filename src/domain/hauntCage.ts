export const HAUNT_CAGE_COLOR = 0xd8d8d8;
export const HAUNT_CAGE_ALPHA = 0.9;
export const HAUNT_CAGE_LINE_PX = 1.5;
export const HAUNT_CAGE_BARS = 3;
export const HAUNT_CAGE_SIZE_MUL = 1.2;
export const HAUNT_CAGE_URGENCY_MS = 1000;
export const HAUNT_CAGE_BLINK_MS = 100;

export type CageLine = { x1: number; y1: number; x2: number; y2: number };

export function hauntCageVisible(remainingMs: number, nowMs: number): boolean {
  if (remainingMs <= 0) {
    return false;
  }
  return remainingMs > HAUNT_CAGE_URGENCY_MS || Math.floor(nowMs / HAUNT_CAGE_BLINK_MS) % 2 === 0;
}

export function hauntCageLines(cx: number, cy: number, ghostSize: number): CageLine[] {
  const half = (ghostSize * HAUNT_CAGE_SIZE_MUL) / 2;
  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;
  const lines: CageLine[] = [
    { x1: left, y1: top, x2: right, y2: top },
    { x1: left, y1: bottom, x2: right, y2: bottom },
    { x1: left, y1: top, x2: left, y2: bottom },
    { x1: right, y1: top, x2: right, y2: bottom },
  ];
  const gap = (right - left) / (HAUNT_CAGE_BARS + 1);
  for (let i = 1; i <= HAUNT_CAGE_BARS; i += 1) {
    const x = left + gap * i;
    lines.push({ x1: x, y1: top, x2: x, y2: bottom });
  }
  return lines;
}
