import {
  COUNT_RECENT_BY_IP_HASH,
  countryOrUnknown,
  MAX_BODY_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  UPSERT_RUN,
  upsertRunValues,
  validateUpload,
} from "./runs";
import {
  BOARD_LIMIT,
  requesterInstallId,
  SELECT_BOARD,
  toBoardRow,
  UPSERT_BEST,
  type BoardDbRow,
} from "./scores";

export type Env = { DB: D1Database; IP_HASH_KEY?: string };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function methodNotAllowed(): Response {
  return json(405, { error: "method_not_allowed" });
}

async function hashIp(key: string, ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(ip));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function postRun(request: Request, env: Env): Promise<Response> {
  if (!env.IP_HASH_KEY) {
    return json(503, { error: "unconfigured" });
  }
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
    return json(413, { error: "too_large" });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json(413, { error: "too_large" });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "invalid" });
  }
  const upload = validateUpload(body);
  if (upload === null) {
    return json(400, { error: "invalid" });
  }
  const ipHash = await hashIp(
    env.IP_HASH_KEY,
    request.headers.get("CF-Connecting-IP") ?? "unknown",
  );
  const now = Date.now();
  const recent = await env.DB.prepare(COUNT_RECENT_BY_IP_HASH)
    .bind(ipHash, new Date(now - RATE_LIMIT_WINDOW_MS).toISOString())
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= RATE_LIMIT_MAX) {
    return json(429, { error: "rate_limited" });
  }
  const country = countryOrUnknown((request as { cf?: { country?: unknown } }).cf?.country);
  await env.DB.batch([
    env.DB.prepare(UPSERT_RUN).bind(
      ...upsertRunValues(upload, { country, ipHash, receivedAt: new Date(now).toISOString() }),
    ),
    env.DB.prepare(UPSERT_BEST).bind(upload.record.id, upload.record.installId),
  ]);
  return json(201, { ok: true });
}

async function getScores(url: URL, env: Env): Promise<Response> {
  const requester = requesterInstallId(url.searchParams.get("installId"));
  const { results } = await env.DB.prepare(SELECT_BOARD).bind(BOARD_LIMIT).all<BoardDbRow>();
  return json(200, { scores: results.map((row) => toBoardRow(row, requester)) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      const url = new URL(request.url);
      if (url.pathname === "/runs") {
        return request.method === "POST" ? await postRun(request, env) : methodNotAllowed();
      }
      if (url.pathname === "/scores") {
        return request.method === "GET" ? await getScores(url, env) : methodNotAllowed();
      }
      return json(404, { error: "not_found" });
    } catch {
      return json(500, { error: "internal" });
    }
  },
};
