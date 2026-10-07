/** Prefixed menu row label: caret when selected, two spaces when idle. */
export function menuOptionText(label: string, selected: boolean): string {
  return selected ? `> ${label}` : `  ${label}`;
}

/**
 * Left edge for a selectable menu row so the bare label stays centered at
 * `centerX` whether the caret prefix or the idle spaces are showing.
 *
 * `fullWidth` is the prefixed string; `labelWidth` is the label alone.
 * Equivalently `centerX - hang - labelWidth/2` where hang is the prefix
 * (and any kern into the first letter), i.e. `fullWidth - labelWidth`.
 */
export function menuOptionLeftX(centerX: number, fullWidth: number, labelWidth: number): number {
  return centerX - fullWidth + labelWidth / 2;
}
