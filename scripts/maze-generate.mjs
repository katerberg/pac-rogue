import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { root } from "./lib/server.mjs";

const DEFAULT_COUNT = 500;

function parseArgs(argv) {
  let count = DEFAULT_COUNT;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--count") {
      const raw = argv[i + 1];
      i += 1;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`Invalid --count ${raw}`);
      }
      count = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npm run maze:generate -- [--count N]

Generate N maze candidates (default ${DEFAULT_COUNT}) via generateMazeAsciiWithRetries
and write artifacts/mazes/candidates.json for the /mazes/ curator.

Seed index attempts are capped by CANDIDATE_SEED_ATTEMPT_CEILING in mazeCandidate.ts.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown arg ${arg}`);
    }
  }
  return { count };
}

async function bundleDomain() {
  const outfile = join(root, "artifacts", "mazes", ".build", "maze-generate.mjs");
  mkdirSync(join(root, "artifacts", "mazes", ".build"), { recursive: true });
  await build({
    entryPoints: [join(root, "scripts", "lib", "mazeGenerateEntry.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "warning",
  });
  return outfile;
}

async function main() {
  const { count } = parseArgs(process.argv.slice(2));
  const bundlePath = await bundleDomain();
  const mod = await import(pathToFileURL(bundlePath).href);
  const {
    CANDIDATE_SEED_ATTEMPT_CEILING,
    MAZE_CANDIDATES_VERSION,
    candidateSeed,
    generateMazeAsciiWithRetries,
    layoutFromAscii,
    tunnelRowsFromLayout,
  } = mod;

  const ceiling = CANDIDATE_SEED_ATTEMPT_CEILING;
  const candidates = [];
  let seedIndex = 0;
  let failures = 0;

  while (candidates.length < count && seedIndex < ceiling) {
    const seed = candidateSeed(seedIndex);
    seedIndex += 1;
    const result = generateMazeAsciiWithRetries(seed);
    if (result === null) {
      failures += 1;
      continue;
    }
    let layout;
    try {
      layout = layoutFromAscii(result.ascii);
    } catch {
      failures += 1;
      continue;
    }
    candidates.push({
      id: candidates.length,
      seed,
      seedUsed: result.seedUsed,
      ascii: result.ascii,
      pelletCount: layout.pelletCount,
      tunnels: tunnelRowsFromLayout(layout),
    });
    if (candidates.length % 50 === 0 || candidates.length === count) {
      console.log(
        `generated ${candidates.length}/${count} (seedIndex=${seedIndex}, failures=${failures})`,
      );
    }
  }

  const outDir = join(root, "artifacts", "mazes");
  mkdirSync(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const file = {
    version: MAZE_CANDIDATES_VERSION,
    generatedAt,
    count: candidates.length,
    candidates,
  };
  const outPath = join(outDir, "candidates.json");
  writeFileSync(outPath, `${JSON.stringify(file)}\n`, "utf8");

  const pellets = candidates.map((c) => c.pelletCount);
  const minP = pellets.length ? Math.min(...pellets) : 0;
  const maxP = pellets.length ? Math.max(...pellets) : 0;
  console.log(
    `wrote ${outPath} (${candidates.length} maps, pellet ${minP}–${maxP}, failures=${failures}, seedIndex=${seedIndex})`,
  );

  if (candidates.length < count) {
    console.error(`only produced ${candidates.length}/${count} within seed ceiling ${ceiling}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
