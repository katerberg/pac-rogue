const CONDITION = /^([\w.]+)\s*(==|!=|<=|>=|<|>)\s*(.*)$/;

function parseValue(raw) {
  if (raw === "true" || raw === "false") {
    return raw === "true";
  }
  if (raw === "null") {
    return null;
  }
  if (raw !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}

export function parseCondition(text) {
  const match = CONDITION.exec(text.trim());
  if (match === null) {
    throw new Error(`Bad condition "${text}"; expected <path><op><value>, e.g. play.lives==3`);
  }
  const [, path, op, raw] = match;
  return { text: text.trim(), path, op, expected: parseValue(raw.trim()) };
}

export function readPath(snapshot, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), snapshot);
}

const COMPARE = {
  "==": (actual, expected) => actual === expected,
  "!=": (actual, expected) => actual !== expected,
  "<": (actual, expected) => typeof actual === "number" && actual < expected,
  "<=": (actual, expected) => typeof actual === "number" && actual <= expected,
  ">": (actual, expected) => typeof actual === "number" && actual > expected,
  ">=": (actual, expected) => typeof actual === "number" && actual >= expected,
};

export function checkCondition(snapshot, { path, op, expected }) {
  const actual = readPath(snapshot, path);
  return { ok: COMPARE[op](actual, expected), actual };
}
