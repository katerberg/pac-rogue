import { describe, expect, it } from "vitest";
import { parseRunLogFillFlag } from "./runLogFillFlag";

describe("parseRunLogFillFlag", () => {
  it.each([
    ["runLogFill=5", 5],
    ["runLogFill=600", 600],
    ["runLogFill=601", null],
    ["runLogFill=-1", null],
    ["runLogFill=x", null],
    ["", null],
  ])("%s → %s", (query, expected) => {
    expect(parseRunLogFillFlag(new URLSearchParams(query))).toBe(expected);
  });
});
