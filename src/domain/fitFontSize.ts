const PIXEL_GLYPH_PX = 8;

export function fitFontSize(text: string, maxWidth: number, preferredSize: number): number {
  const longestWord = Math.max(1, ...text.split(/\s+/).map((word) => word.length));
  const fitting = Math.floor(maxWidth / longestWord / PIXEL_GLYPH_PX) * PIXEL_GLYPH_PX;
  return Math.max(PIXEL_GLYPH_PX, Math.min(preferredSize, fitting));
}
