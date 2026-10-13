const PRESETS = ["smoke", "pilot", "full"];
const EXPERIMENTS = ["builds", "singles", "pairs", "schools", "enemies"];

export const USAGE = `Usage:
  npm run balance -- [--preset smoke|pilot|full] [--budget-hours N] [--workers N]
                     [--only builds,singles,pairs,schools,enemies] [--profiles cautious@average,...]
                     [--dry-run] [--calibrate-seconds N] [--out DIR]
  npm run balance:compare -- <beforeDir> <afterDir>`;

function positiveNumber(flag, raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flag} needs a positive number, got "${raw}"`);
  }
  return value;
}

function list(flag, raw, allowed) {
  const values = String(raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(`${flag} needs a comma-separated list`);
  }
  const unknown = allowed === null ? [] : values.filter((v) => !allowed.includes(v));
  if (unknown.length > 0) {
    throw new Error(`${flag}: unknown ${unknown.join(", ")}; expected ${allowed.join(", ")}`);
  }
  return values;
}

export function parseBalanceArgs(argv, defaultWorkers) {
  if (argv[0] === "--worker") {
    return { mode: "worker", bundle: argv[1] };
  }
  if (argv[0] === "--compare") {
    if (argv.length !== 3) {
      throw new Error(`--compare needs two run directories\n${USAGE}`);
    }
    return { mode: "compare", before: argv[1], after: argv[2] };
  }
  const options = {
    mode: "run",
    preset: "full",
    budgetHours: null,
    workers: defaultWorkers,
    only: EXPERIMENTS,
    profiles: null,
    dryRun: false,
    calibrateSeconds: 60,
    out: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = () => {
      i += 1;
      if (argv[i] === undefined) {
        throw new Error(`${flag} needs a value`);
      }
      return argv[i];
    };
    switch (flag) {
      case "--preset": {
        const preset = value();
        if (!PRESETS.includes(preset)) {
          throw new Error(`--preset must be one of ${PRESETS.join(", ")}`);
        }
        options.preset = preset;
        break;
      }
      case "--budget-hours":
        options.budgetHours = positiveNumber(flag, value());
        break;
      case "--workers":
        options.workers = Math.floor(positiveNumber(flag, value()));
        break;
      case "--only":
        options.only = list(flag, value(), EXPERIMENTS);
        break;
      case "--profiles":
        options.profiles = list(flag, value(), null);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--calibrate-seconds":
        options.calibrateSeconds = positiveNumber(flag, value());
        break;
      case "--out":
        options.out = value();
        break;
      default:
        throw new Error(`Unknown option "${flag}"\n${USAGE}`);
    }
  }
  if (options.budgetHours === null && options.preset !== "smoke") {
    options.budgetHours = options.preset === "pilot" ? 0.5 : 6;
  }
  if (options.preset === "smoke" && options.budgetHours !== null) {
    throw new Error("--budget-hours does not apply to the smoke preset (it has a fixed size)");
  }
  return options;
}

export function runDirName(date, preset) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${stamp}-${preset}`;
}
