import { describe, expect, it } from "vitest";
import { LAZY_LOOPER_OPTIONAL_TINT } from "./lazyLooper";
import { mazeColorForIndex } from "./mazeColorSettings";
import { pelletGlowFilter, pelletStyleFor, samePelletStyle } from "./pelletStyle";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";

describe("pelletStyleFor", () => {
  it("returns neon defaults with maze-coloured bloom when STYLE is neon", () => {
    const style = pelletStyleFor(null, 2, "neon");
    expect(style).not.toBeNull();
    expect(style!.regular).toEqual({
      radius: DEFAULT_TUNING.pelletRadius,
      strokeWidth: DEFAULT_TUNING.pelletStrokeWidth,
      coreColor: DEFAULT_TUNING.pelletCoreColor,
      glow: DEFAULT_TUNING.pelletGlow,
      glowRadius: DEFAULT_TUNING.pelletGlowRadius,
      glowColor: mazeColorForIndex(2),
      fillColor: DEFAULT_TUNING.pelletCoreColor,
      fillOpacity: 1,
    });
    expect(style!.power.radius).toBe(DEFAULT_TUNING.powerPelletRadius);
    expect(style!.power.strokeWidth).toBe(DEFAULT_TUNING.powerPelletStrokeWidth);
    expect(style!.power.glow).toBe(DEFAULT_TUNING.powerPelletGlow);
    expect(style!.power.glowRadius).toBe(DEFAULT_TUNING.powerPelletGlowRadius);
    expect(style!.power.glowColor).toBe(mazeColorForIndex(2));
    expect(style!.boss.radius).toBe(DEFAULT_TUNING.bossPelletRadius);
    expect(style!.optional).toEqual({
      radius: DEFAULT_TUNING.optionalPelletRadius,
      strokeWidth: DEFAULT_TUNING.optionalPelletStrokeWidth,
      coreColor: LAZY_LOOPER_OPTIONAL_TINT,
      glow: DEFAULT_TUNING.optionalPelletGlow,
      glowRadius: DEFAULT_TUNING.optionalPelletGlowRadius,
      glowColor: DEFAULT_TUNING.optionalPelletGlowColor,
      fillColor: LAZY_LOOPER_OPTIONAL_TINT,
      fillOpacity: 1,
    });
  });

  it("returns null for PIXEL when knobs are off", () => {
    expect(pelletStyleFor(null, 0, "pixel")).toBeNull();
  });

  it("uses knob values including glow colour when tuning is set", () => {
    const style = pelletStyleFor(
      resolveTuning({
        pelletGlow: 9,
        pelletGlowRadius: 40,
        pelletGlowColor: 0xff00aa,
        powerPelletStrokeWidth: 8,
      }),
      0,
      "pixel",
    );
    expect(style).not.toBeNull();
    expect(style!.regular.glow).toBe(9);
    expect(style!.regular.glowRadius).toBe(40);
    expect(style!.regular.glowColor).toBe(0xff00aa);
    expect(style!.power.strokeWidth).toBe(8);
    expect(style!.power.glowColor).toBe(0xff00aa);
  });
});

describe("pelletGlowFilter", () => {
  it("is null with no glow strength or radius", () => {
    const style = pelletStyleFor(resolveTuning({ pelletGlow: 0 }), 0, "neon")!;
    expect(pelletGlowFilter(style.regular)).toBeNull();
    const noRadius = pelletStyleFor(resolveTuning({ pelletGlowRadius: 0 }), 0, "neon")!;
    expect(pelletGlowFilter(noRadius.regular)).toBeNull();
  });

  it("passes glow through as raw outerStrength", () => {
    const style = pelletStyleFor(
      resolveTuning({ pelletGlow: 1.2, pelletGlowRadius: 7 }),
      0,
      "neon",
    )!;
    expect(pelletGlowFilter(style.regular)).toEqual({ outerStrength: 1.2, distance: 7 });
  });
});

describe("samePelletStyle", () => {
  it("compares styles and nulls", () => {
    const a = pelletStyleFor(null, 0, "neon");
    const b = pelletStyleFor(null, 0, "neon");
    expect(samePelletStyle(a, b)).toBe(true);
    expect(samePelletStyle(a, null)).toBe(false);
    expect(samePelletStyle(null, null)).toBe(true);
    expect(samePelletStyle(a, pelletStyleFor(null, 1, "neon"))).toBe(false);
  });
});
