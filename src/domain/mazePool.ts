import poolFile from "./mazePool.json";
import { randomFromSeed } from "./mazeTiling";

export const MAZE_POOL_VERSION = 1 as const;

export type MazePoolMap = {
  id: number;
  sourceId: number;
  seed: string;
  seedUsed: string;
  ascii: string;
  pelletCount: number;
  tunnels: number[];
};

export type MazePoolFile = {
  version: typeof MAZE_POOL_VERSION;
  exportedAt: string;
  count: number;
  maps: MazePoolMap[];
};

function loadPool(): readonly MazePoolMap[] {
  const file = poolFile as MazePoolFile;
  if (file.version !== MAZE_POOL_VERSION) {
    throw new Error(`unsupported maze pool version ${String(file.version)}`);
  }
  if (!Array.isArray(file.maps) || file.maps.length === 0) {
    throw new Error("maze pool is empty");
  }
  if (file.count !== file.maps.length) {
    throw new Error(`maze pool count ${file.count} !== maps ${file.maps.length}`);
  }
  for (let i = 0; i < file.maps.length; i += 1) {
    const map = file.maps[i]!;
    if (map.id !== i) {
      throw new Error(`maze pool id ${map.id} at index ${i}`);
    }
  }
  return file.maps;
}

export const MAZE_POOL: readonly MazePoolMap[] = loadPool();

export function mazePoolSize(): number {
  return MAZE_POOL.length;
}

export function mazePoolMap(index: number): MazePoolMap | null {
  if (!Number.isInteger(index) || index < 0 || index >= MAZE_POOL.length) {
    return null;
  }
  return MAZE_POOL[index] ?? null;
}

export function pickPoolIndex(runSeed: string): number {
  const roll = randomFromSeed(`${runSeed}:pool`)();
  return Math.floor(roll * MAZE_POOL.length) % MAZE_POOL.length;
}
