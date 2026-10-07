import dotmanSvg from "./dotman.svg?raw";
import { parseLineArt, turnLineArt, type LineArt } from "../../domain/lineArt";

export const DOTMAN_LINE_ART = parseLineArt(dotmanSvg);

export const DOTMAN_LINE_ART_BY_DIR: Record<"up" | "down" | "left" | "right", LineArt> = {
  right: DOTMAN_LINE_ART,
  down: turnLineArt(DOTMAN_LINE_ART, 1),
  left: turnLineArt(DOTMAN_LINE_ART, 2),
  up: turnLineArt(DOTMAN_LINE_ART, 3),
};
