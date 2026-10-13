import { execFileSync, fork } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { parseBalanceArgs, runDirName, USAGE } from "./lib/balanceArgs.mjs";
import { root } from "./lib/server.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const PROGRESS_MS = 30_000;

async function bundle() {
  const outfile = join(root, "artifacts", "balance", ".build", "bots.mjs");
  await build({
    entryPoints: [join(root, "src", "game", "sim", "bots", "index.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "warning",
  });
  return outfile;
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function errorResult(job, message) {
  return {
    job,
    outcome: "error",
    levelReached: job.level ?? 0,
    progress: 0,
    simMs: 0,
    deaths: [],
    ghostOutMs: {},
    offers: [],
    finalLoadout: [],
    quartersSpent: 0,
    storeStall: false,
    error: message,
  };
}

function runPool(bundlePath, jobs, workers, onResult, shouldStop) {
  return new Promise((done) => {
    let next = 0;
    let live = 0;
    const start = () => {
      const child = fork(scriptPath, ["--worker", bundlePath], {
        stdio: ["ignore", "inherit", "inherit", "ipc"],
      });
      let current = null;
      live += 1;
      const dispatch = () => {
        if (shouldStop() || next >= jobs.length) {
          current = null;
          child.kill();
          return;
        }
        current = jobs[next];
        next += 1;
        child.send({ job: current });
      };
      child.on("message", ({ result, ms }) => {
        onResult(result, ms);
        dispatch();
      });
      child.on("exit", (code) => {
        live -= 1;
        if (current !== null) {
          onResult(errorResult(current, `worker exited with code ${code}`), 0);
          current = null;
          if (!shouldStop() && next < jobs.length) {
            start();
          }
        }
        if (live === 0) {
          done();
        }
      });
      dispatch();
    };
    const count = Math.max(1, Math.min(workers, jobs.length));
    if (jobs.length === 0) {
      done();
      return;
    }
    for (let i = 0; i < count; i += 1) {
      start();
    }
  });
}

async function calibrate(bundlePath, workers, seconds) {
  const jobs = Array.from({ length: 10_000 }, (_, i) =>
    i % 2 === 0
      ? { experiment: "builds", arm: "build", profile: "cautious@expert", seed: `cal-${i}` }
      : {
          experiment: "singles",
          arm: "none",
          profile: "cautious@expert",
          seed: `cal-${i}`,
          level: 5,
        },
  );
  const times = { builds: [], forced: [] };
  const started = Date.now();
  const enough = () =>
    Date.now() - started > seconds * 1000 && times.builds.length > 0 && times.forced.length > 0;
  console.log(`Calibrating throughput for ${seconds}s on ${workers} workers…`);
  await runPool(
    bundlePath,
    jobs,
    workers,
    (result, ms) =>
      (result.job.experiment === "builds" ? times.builds : times.forced).push(ms / 1000),
    enough,
  );
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const throughput = {
    buildSeconds: mean(times.builds),
    forcedSeconds: mean(times.forced),
    workers,
  };
  console.log(
    `  build run ${throughput.buildSeconds.toFixed(2)}s, one-level test ${throughput.forcedSeconds.toFixed(2)}s per worker`,
  );
  return throughput;
}

function describePlan(plan) {
  const lines = [`Plan (${plan.preset}):`];
  for (const experiment of Object.keys(plan.seedsPerArm)) {
    const arms = plan.arms.filter((arm) => arm.experiment === experiment).length;
    const jobs = plan.jobs.filter((job) => job.experiment === experiment).length;
    if (arms > 0) {
      lines.push(
        `  ${experiment}: ${arms} arms × ${plan.seedsPerArm[experiment]} seeds → ${jobs} episodes`,
      );
    }
  }
  if (plan.rerun.pairs > 0 && plan.jobs.some((job) => job.experiment === "pairs")) {
    lines.push(`  pair reruns: top ${plan.rerun.pairs} pairs × ${plan.rerun.seeds} extra seeds`);
  }
  if (plan.estimatedSeconds !== null) {
    lines.push(`  estimated time: ${(plan.estimatedSeconds / 3600).toFixed(2)} h`);
  }
  return lines.join("\n");
}

async function runBatch(lib, bundlePath, options) {
  const throughput =
    options.preset === "smoke"
      ? null
      : await calibrate(bundlePath, options.workers, options.calibrateSeconds);
  if (options.profiles !== null) {
    options.profiles.forEach((id) => lib.profileFor(id));
  }
  let plan;
  try {
    plan = lib.planJobs({
      preset: options.preset,
      throughput,
      budgetHours: options.budgetHours,
      only: options.only,
      profiles: options.profiles ?? undefined,
    });
  } catch (error) {
    if (error instanceof lib.BudgetError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  console.log(describePlan(plan));
  if (options.dryRun) {
    return;
  }

  const outDir = resolve(
    options.out ?? join(root, "artifacts", "balance", runDirName(new Date(), options.preset)),
  );
  mkdirSync(outDir, { recursive: true });
  const episodesPath = join(outDir, "episodes.jsonl");
  writeFileSync(episodesPath, "");
  const results = [];
  let interrupted = false;
  process.on("SIGINT", () => {
    interrupted = true;
    console.log("\nInterrupted: finishing in-flight episodes, then writing a partial report…");
  });
  const started = Date.now();
  let lastProgress = started;
  const record = (total) => (result) => {
    results.push(result);
    appendFileSync(episodesPath, `${JSON.stringify(result)}\n`);
    if (Date.now() - lastProgress > PROGRESS_MS) {
      lastProgress = Date.now();
      const elapsed = (Date.now() - started) / 1000;
      const eta = (elapsed / results.length) * (total - results.length);
      console.log(
        `  ${results.length}/${total} episodes, ${Math.round(elapsed / 60)} min elapsed, ~${Math.round(eta / 60)} min left`,
      );
    }
  };
  console.log(`Running ${plan.jobs.length} episodes on ${options.workers} workers → ${outDir}`);
  await runPool(
    bundlePath,
    plan.jobs,
    options.workers,
    record(plan.jobs.length),
    () => interrupted,
  );

  const meta = (partial) => ({
    gitSha: gitSha(),
    createdAt: new Date().toISOString(),
    preset: options.preset,
    budgetHours: options.budgetHours,
    seedsPerArm: plan.seedsPerArm,
    partial,
  });
  if (!interrupted && plan.rerun.pairs > 0) {
    const pairs = lib.rerunPairs(lib.summarize(results, meta(false)), plan.rerun.pairs);
    const rerunJobs = plan.arms
      .filter((arm) => arm.experiment === "pairs" && pairs.includes(arm.arm))
      .flatMap((arm) => lib.jobsFor(arm, plan.rerun.seeds, plan.seedsPerArm.pairs));
    if (rerunJobs.length > 0) {
      console.log(
        `Re-running the ${pairs.length} most extreme pairs (${rerunJobs.length} episodes)…`,
      );
      await runPool(
        bundlePath,
        rerunJobs,
        options.workers,
        record(plan.jobs.length + rerunJobs.length),
        () => interrupted,
      );
    }
  }
  const summary = lib.summarize(results, meta(interrupted));
  writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(outDir, "report.md"), `${lib.renderReport(summary)}\n`);
  const h = summary.health;
  console.log(
    `Done in ${Math.round((Date.now() - started) / 60_000)} min: ${h.episodes} episodes, ${h.stalled} stalled, ${h.errors} errors.`,
  );
  console.log(`Report: ${join(outDir, "report.md")}`);
  if (h.untrustworthy) {
    console.log("WARNING: too many stalled episodes; the report is marked UNTRUSTWORTHY.");
  }
}

function compare(lib, beforeDir, afterDir) {
  const read = (dir) => {
    const path = join(resolve(dir), "summary.json");
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      console.error(`Could not read ${path}`);
      process.exit(1);
    }
  };
  const markdown = lib.compareSummaries(read(beforeDir), read(afterDir));
  writeFileSync(join(resolve(afterDir), "compare.md"), `${markdown}\n`);
  console.log(markdown);
}

async function worker(bundlePath) {
  const lib = await import(pathToFileURL(bundlePath).href);
  process.on("SIGINT", () => {});
  process.on("message", ({ job }) => {
    const started = performance.now();
    const result = lib.runJob(job);
    process.send({ result, ms: performance.now() - started });
  });
}

async function main() {
  let options;
  try {
    options = parseBalanceArgs(process.argv.slice(2), Math.max(1, availableParallelism() - 1));
  } catch (error) {
    console.error(error.message);
    console.error(USAGE);
    process.exit(1);
  }
  if (options.mode === "worker") {
    await worker(options.bundle);
    return;
  }
  const bundlePath = await bundle();
  const lib = await import(pathToFileURL(bundlePath).href);
  if (options.mode === "compare") {
    compare(lib, options.before, options.after);
    return;
  }
  await runBatch(lib, bundlePath, options);
}

await main();
