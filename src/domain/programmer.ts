import { canEnterDirection, cellCenterX, cellCenterY, type SolidGrid } from "./maze";

export type ProgramDir = "up" | "down" | "left" | "right";

export const PROGRAMMER_PRESSES = 5;
export const PROGRAMMER_ENHANCED_SETS = 2;

export type ProgrammerRecording = { phase: "recording"; presses: ProgramDir[]; setsLeft: number };
export type ProgrammerRunning = {
  phase: "running";
  program: ProgramDir[];
  heading: ProgramDir;
  setsLeft: number;
};
export type ProgrammerState = ProgrammerRecording | ProgrammerRunning;

const STEP: Record<ProgramDir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const PERPENDICULAR: Record<ProgramDir, readonly ProgramDir[]> = {
  up: ["left", "right"],
  down: ["left", "right"],
  left: ["up", "down"],
  right: ["up", "down"],
};

export function startProgrammer(sets: number): ProgrammerRecording {
  return { phase: "recording", presses: [], setsLeft: sets - 1 };
}

function openAt(solids: SolidGrid, col: number, row: number, dir: ProgramDir): boolean {
  const { dx, dy } = STEP[dir];
  return canEnterDirection(cellCenterX(col), cellCenterY(row), dx, dy, solids);
}

export function isIntersection(
  solids: SolidGrid,
  col: number,
  row: number,
  heading: ProgramDir,
): boolean {
  return PERPENDICULAR[heading].some((dir) => openAt(solids, col, row, dir));
}

export type ProgrammerStep = { state: ProgrammerState | null; heading: ProgramDir | null };

function takeFirstOpen(
  program: readonly ProgramDir[],
  solids: SolidGrid,
  col: number,
  row: number,
): { dir: ProgramDir; rest: ProgramDir[] } | null {
  const index = program.findIndex((dir) => openAt(solids, col, row, dir));
  return index < 0 ? null : { dir: program[index]!, rest: program.slice(index + 1) };
}

function launch(
  program: ProgramDir[],
  setsLeft: number,
  solids: SolidGrid,
  col: number,
  row: number,
): ProgrammerStep {
  const taken = takeFirstOpen(program, solids, col, row);
  if (taken === null) {
    return finishRun(setsLeft, null);
  }
  return {
    state: { phase: "running", program: taken.rest, heading: taken.dir, setsLeft },
    heading: taken.dir,
  };
}

function finishRun(setsLeft: number, heading: ProgramDir | null): ProgrammerStep {
  return { state: setsLeft > 0 ? startProgrammer(setsLeft) : null, heading };
}

export function recordProgrammerPress(
  state: ProgrammerRecording,
  dir: ProgramDir,
  solids: SolidGrid,
  col: number,
  row: number,
  presses: number = PROGRAMMER_PRESSES,
): ProgrammerStep {
  const recorded = [...state.presses, dir];
  if (recorded.length < presses) {
    return { state: { ...state, presses: recorded }, heading: null };
  }
  return launch(recorded, state.setsLeft, solids, col, row);
}

export function programmerEnterCell(
  state: ProgrammerRunning,
  solids: SolidGrid,
  col: number,
  row: number,
): ProgrammerStep {
  const { heading } = state;
  const straight = openAt(solids, col, row, heading);
  if (!isIntersection(solids, col, row, heading)) {
    return straight ? { state, heading } : finishRun(state.setsLeft, null);
  }
  const taken = takeFirstOpen(state.program, solids, col, row);
  if (taken === null) {
    return finishRun(state.setsLeft, straight ? heading : null);
  }
  return { state: { ...state, program: taken.rest, heading: taken.dir }, heading: taken.dir };
}

export type ProgrammerQueueSlot = { x: number; y: number; dir: ProgramDir | null };

export const PROGRAMMER_QUEUE_GAP_TILES = 0.75;
export const PROGRAMMER_QUEUE_RISE_TILES = 1.1;

export function programmerQueueSlots(
  presses: readonly ProgramDir[],
  x: number,
  y: number,
  tilePx: number,
  slots: number = PROGRAMMER_PRESSES,
): ProgrammerQueueSlot[] {
  const gap = tilePx * PROGRAMMER_QUEUE_GAP_TILES;
  const left = x - (gap * (slots - 1)) / 2;
  return Array.from({ length: slots }, (_, index) => ({
    x: left + gap * index,
    y: y - tilePx * PROGRAMMER_QUEUE_RISE_TILES,
    dir: presses[index] ?? null,
  }));
}

export const PROGRAMMER_ARROW_TILES = 0.3;
export const PROGRAMMER_EMPTY_SLOT_TILES = 0.08;

export function programmerArrowPoints(
  x: number,
  y: number,
  dir: ProgramDir,
  tilePx: number,
): { x: number; y: number }[] {
  const half = tilePx * PROGRAMMER_ARROW_TILES;
  const { dx, dy } = STEP[dir];
  return [
    { x: x + dx * half, y: y + dy * half },
    { x: x - dx * half - dy * half, y: y - dy * half - dx * half },
    { x: x - dx * half + dy * half, y: y - dy * half + dx * half },
  ];
}
