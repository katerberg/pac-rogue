export type LinePaint = "currentColor" | "none" | number;
export type LinePoint = { x: number; y: number; s: number };
export type LineStrand = {
  id: string;
  points: LinePoint[];
  length: number;
  closed: boolean;
  stroke: LinePaint;
  fill: LinePaint;
  fillOpacity: number;
};
export type LineArt = { width: number; height: number; strands: LineStrand[] };

type Vec = { x: number; y: number };

const UNSUPPORTED_TAGS = [
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "use",
  "text",
] as const;
const EPS = 1e-6;
const ARG_COUNT: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, A: 7, Z: 0 };

function fail(message: string): never {
  throw new Error(`lineArt: ${message}`);
}

function parseAttrs(source: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of source.matchAll(/([\w-]+)="([^"]*)"/g)) {
    attrs.set(match[1]!, match[2]!);
  }
  return attrs;
}

function parsePaint(value: string | undefined): LinePaint {
  if (value === undefined || value === "none") {
    return "none";
  }
  if (value === "currentColor") {
    return "currentColor";
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value.slice(1), 16);
  }
  return fail(`unsupported paint "${value}"`);
}

function tokenize(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const pattern = /([A-Za-z])|(-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?)|([\s,]+)|(.)/gi;
  for (const match of d.matchAll(pattern)) {
    if (match[1] !== undefined) {
      if (!/[MmLlHhVvCcQqAaZz]/.test(match[1])) {
        fail(`unsupported path command ${match[1]}`);
      }
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(Number(match[2]));
    } else if (match[4] !== undefined) {
      fail(`bad path data near "${match[4]}"`);
    }
  }
  return tokens;
}

function cubicAt(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
  };
}

function quadAt(p0: Vec, p1: Vec, p2: Vec, t: number): Vec {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
  return sign * Math.acos(Math.max(-1, Math.min(1, cos)));
}

// SVG 1.1 implementation notes F.6.5: endpoint → centre parameterization.
function arcPoints(
  from: Vec,
  rxIn: number,
  ryIn: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  to: Vec,
  step: number,
): Vec[] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < EPS || ry < EPS) {
    return [to];
  }
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (from.x - to.x) / 2;
  const dy = (from.y - to.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const grow = Math.sqrt(lambda);
    rx *= grow;
    ry *= grow;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + to.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + to.y) / 2;
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) {
    delta -= 2 * Math.PI;
  } else if (sweep && delta < 0) {
    delta += 2 * Math.PI;
  }
  const n = Math.max(4, Math.ceil((Math.abs(delta) * Math.max(rx, ry)) / step));
  const points: Vec[] = [];
  for (let i = 1; i <= n; i += 1) {
    if (i === n) {
      points.push(to);
      break;
    }
    const angle = theta1 + (delta * i) / n;
    const ex = rx * Math.cos(angle);
    const ey = ry * Math.sin(angle);
    points.push({ x: cosPhi * ex - sinPhi * ey + cx, y: sinPhi * ex + cosPhi * ey + cy });
  }
  return points;
}

function flattenPath(d: string, step: number): { points: Vec[]; closed: boolean } {
  const tokens = tokenize(d);
  const points: Vec[] = [];
  let current: Vec = { x: 0, y: 0 };
  let start: Vec | null = null;
  let closed = false;
  let command: string | null = null;
  let i = 0;

  const take = (count: number): number[] => {
    const args: number[] = [];
    for (let k = 0; k < count; k += 1) {
      const token = tokens[i + k];
      if (typeof token !== "number") {
        fail(`command ${command} expects ${count} numbers`);
      }
      args.push(token);
    }
    i += count;
    return args;
  };
  const lineTo = (to: Vec): void => {
    const pieces = Math.max(1, Math.ceil(dist(current, to) / step));
    for (let k = 1; k <= pieces; k += 1) {
      points.push({
        x: current.x + ((to.x - current.x) * k) / pieces,
        y: current.y + ((to.y - current.y) * k) / pieces,
      });
    }
  };

  while (i < tokens.length) {
    const token = tokens[i];
    if (typeof token === "string") {
      command = token;
      i += 1;
    } else if (command === null) {
      fail("path data must start with M");
    }
    const upper: string = command!.toUpperCase();
    const relative: boolean = command !== upper;
    if (upper !== "M" && start === null) {
      fail("path data must start with M");
    }
    if (closed) {
      fail("one subpath per path (split into separate ids)");
    }
    const args = take(ARG_COUNT[upper]!);
    const base = relative ? current : { x: 0, y: 0 };
    const at = (ax: number, ay: number): Vec => ({ x: base.x + ax, y: base.y + ay });
    switch (upper) {
      case "M": {
        if (start !== null) {
          fail("one subpath per path (split into separate ids)");
        }
        current = at(args[0]!, args[1]!);
        start = current;
        points.push(current);
        command = relative ? "l" : "L";
        break;
      }
      case "L":
      case "H":
      case "V": {
        const to =
          upper === "L"
            ? at(args[0]!, args[1]!)
            : upper === "H"
              ? { x: (relative ? current.x : 0) + args[0]!, y: current.y }
              : { x: current.x, y: (relative ? current.y : 0) + args[0]! };
        lineTo(to);
        current = to;
        break;
      }
      case "C": {
        const c1 = at(args[0]!, args[1]!);
        const c2 = at(args[2]!, args[3]!);
        const to = at(args[4]!, args[5]!);
        const hull = dist(current, c1) + dist(c1, c2) + dist(c2, to) + dist(current, to);
        const n = Math.max(4, Math.ceil(hull / 2 / step));
        for (let k = 1; k <= n; k += 1) {
          points.push(k === n ? to : cubicAt(current, c1, c2, to, k / n));
        }
        current = to;
        break;
      }
      case "Q": {
        const c1 = at(args[0]!, args[1]!);
        const to = at(args[2]!, args[3]!);
        const hull = dist(current, c1) + dist(c1, to) + dist(current, to);
        const n = Math.max(4, Math.ceil(hull / 2 / step));
        for (let k = 1; k <= n; k += 1) {
          points.push(k === n ? to : quadAt(current, c1, to, k / n));
        }
        current = to;
        break;
      }
      case "A": {
        const to = at(args[5]!, args[6]!);
        points.push(
          ...arcPoints(
            current,
            args[0]!,
            args[1]!,
            args[2]!,
            args[3]! !== 0,
            args[4]! !== 0,
            to,
            step,
          ),
        );
        current = to;
        break;
      }
      case "Z": {
        if (dist(current, start!) > EPS) {
          lineTo(start!);
        }
        current = start!;
        closed = true;
        break;
      }
    }
  }
  if (start === null) {
    fail("empty path data");
  }
  return { points, closed };
}

function withDistance(raw: Vec[]): LinePoint[] {
  const points: LinePoint[] = [];
  for (const p of raw) {
    const prev = points[points.length - 1];
    if (prev === undefined) {
      points.push({ x: p.x, y: p.y, s: 0 });
    } else if (dist(prev, p) >= EPS) {
      points.push({ x: p.x, y: p.y, s: prev.s + dist(prev, p) });
    }
  }
  return points;
}

export function parseLineArt(svg: string, step = 1): LineArt {
  for (const tag of UNSUPPORTED_TAGS) {
    if (new RegExp(`<${tag}\\b`).test(svg)) {
      fail(`unsupported <${tag}>`);
    }
  }
  if (/\btransform=/.test(svg)) {
    fail("transform not supported");
  }
  const viewBox = /\bviewBox="([^"]*)"/
    .exec(svg)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox === undefined ||
    viewBox.length !== 4 ||
    viewBox[0] !== 0 ||
    viewBox[1] !== 0 ||
    !(viewBox[2]! > 0) ||
    !(viewBox[3]! > 0)
  ) {
    fail('viewBox must be "0 0 W H"');
  }
  const strands: LineStrand[] = [];
  for (const match of svg.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const attrs = parseAttrs(match[1]!);
    const id = attrs.get("id") ?? fail("path missing id");
    const d = attrs.get("d") ?? fail(`path ${id} missing d`);
    const { points: raw, closed } = flattenPath(d, step);
    const points = withDistance(raw);
    const fillOpacity = Number(attrs.get("fill-opacity") ?? 1);
    if (!Number.isFinite(fillOpacity)) {
      fail(`path ${id} has a bad fill-opacity`);
    }
    strands.push({
      id,
      points,
      length: points[points.length - 1]!.s,
      closed,
      stroke: parsePaint(attrs.get("stroke")),
      fill: parsePaint(attrs.get("fill")),
      fillOpacity,
    });
  }
  return { width: viewBox[2]!, height: viewBox[3]!, strands };
}
