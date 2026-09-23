export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
  minOverlapFraction = 0,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = (ar + br) * (1 - minOverlapFraction);
  return dx * dx + dy * dy <= reach * reach;
}
