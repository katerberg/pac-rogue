const GLYPH_PIXELS = 8;

export function fitFontSize(text: string, maxWidth: number, preferredSize: number): number {
  const longestWord = Math.max(1, ...text.split(/\s+/).map((word) => word.length));
  const fitting = Math.floor(maxWidth / longestWord / GLYPH_PIXELS) * GLYPH_PIXELS;
  return Math.max(GLYPH_PIXELS, Math.min(preferredSize, fitting));
}
