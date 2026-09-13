import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

const requiredPaths = [
  "src/domain/playfield.ts",
  "src/domain/maze.ts",
  "src/game/components/Position.ts",
  "src/game/components/Velocity.ts",
  "src/game/components/Input.ts",
  "src/game/components/Facing.ts",
  "src/game/components/Wall.ts",
  "src/game/components/Player.ts",
  "src/game/components/Drawable.ts",
  "src/game/systems/playerInput.ts",
  "src/game/systems/movement.ts",
  "src/game/systems/render.ts",
  "src/game/scenes/PlayScene.ts",
];

const phaserAllow = [
  /^src\/main\.ts$/,
  /^src\/game\/config\.ts$/,
  /^src\/game\/scenes\//,
  /^src\/game\/systems\/playerInput\.ts$/,
  /^src\/game\/systems\/render\.ts$/,
];

const phaserImport = /\bfrom\s+["']phaser(?:\/[^"']*)?["']|\bimport\s+["']phaser(?:\/[^"']*)?["']/;
const worldApi = /\bcreateWorld\b|\baddEntity\b/;

function toPosix(filePath) {
  return relative(root, filePath).split("\\").join("/");
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const errors = [];

for (const rel of requiredPaths) {
  if (!existsSync(join(root, rel))) {
    errors.push(`Missing required ECS file: ${rel}`);
  }
}

for (const file of walk(srcRoot)) {
  const rel = toPosix(file);
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) {
    continue;
  }

  const source = readFileSync(file, "utf8");
  const phaserAllowed = phaserAllow.some((pattern) => pattern.test(rel));

  if (phaserImport.test(source) && !phaserAllowed) {
    errors.push(`Phaser import is not allowed in ${rel}`);
  }

  if (worldApi.test(source) && !rel.startsWith("src/game/scenes/")) {
    errors.push(`createWorld/addEntity must live in src/game/scenes/** (found in ${rel})`);
  }

  if (rel.startsWith("src/domain/") && /\bfrom\s+["']bitecs["']/.test(source)) {
    errors.push(`domain helpers must not import bitecs (${rel})`);
  }
}

if (errors.length > 0) {
  console.error("ECS boundary check failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("ECS boundary check OK");
