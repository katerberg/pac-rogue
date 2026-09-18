import { describe, expect, it } from "vitest";
import { pickPelletToPowerTarget } from "./pelletToPower";

describe("pickPelletToPowerTarget", () => {
  it("returns null when empty", () => {
    expect(pickPelletToPowerTarget([], () => 0)).toBeNull();
    expect(pickPelletToPowerTarget([], () => 0.99)).toBeNull();
  });

  it("returns the only candidate", () => {
    expect(pickPelletToPowerTarget([42], () => 0)).toBe(42);
    expect(pickPelletToPowerTarget([42], () => 0.99)).toBe(42);
  });

  it("picks uniformly among many via rng", () => {
    const candidates = [10, 20, 30];
    expect(pickPelletToPowerTarget(candidates, () => 0)).toBe(10);
    expect(pickPelletToPowerTarget(candidates, () => 0.34)).toBe(20);
    expect(pickPelletToPowerTarget(candidates, () => 0.67)).toBe(30);
    expect(pickPelletToPowerTarget(candidates, () => 0.999)).toBe(30);
  });
});
