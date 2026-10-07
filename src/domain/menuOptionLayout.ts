/** Prefixed menu row label: caret when selected, two spaces when idle. */
export function menuOptionText(label: string, selected: boolean): string {
  return selected ? `> ${label}` : `  ${label}`;
}

/**
 * Left edge for a selectable menu row so the bare label stays centered at
 * `centerX` whether the caret prefix or the idle spaces are showing.
 *
 * `fullWidth` is the prefixed string; `labelWidth` is the label alone. The
 * hang to the left of the label (prefix + any kern into the first letter) is
 * `fullWidth - labelWidth`, so proportional neon glyphs and monospace pixel
 * glyphs both keep the letters fixed while the caret appears.
 */
export function menuOptionLeftX(centerX: number, fullWidth: number, labelWidth: number): number {
  const hangLeft = fullWidth - labelWidth;
  return centerX - hangLeft - labelWidth / 2;
}
