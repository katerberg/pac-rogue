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

export function checkCondition(snapshot, condition) {
  const actual = readPath(snapshot, condition.path);
  const { op, expected } = condition;
  switch (op) {
    case "==":
      return { ok: actual === expected, actual };
    case "!=":
      return { ok: actual !== expected, actual };
    case "<":
      return { ok: typeof actual === "number" && actual < expected, actual };
    case "<=":
      return { ok: typeof actual === "number" && actual <= expected, actual };
    case ">":
      return { ok: typeof actual === "number" && actual > expected, actual };
    case ">=":
      return { ok: typeof actual === "number" && actual >= expected, actual };
    default:
      throw new Error(`Unknown operator ${op}`);
  }
}
