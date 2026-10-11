import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./lib/server.mjs";

const PAGE_SIZE = 1000;
const DATABASE = "dot-man-api";
const outDir = join(root, "data-exports");
const local = process.argv.includes("--local");

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function query(sql) {
  const result = spawnSync(
    process.execPath,
    [
      join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
      "d1",
      "execute",
      DATABASE,
      local ? "--local" : "--remote",
      "--json",
      "--config",
      join(root, "worker", "wrangler.toml"),
      "--command",
      sql,
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    console.error(
      local
        ? "data:pull --local failed: run `npm run worker:migrate:local` first."
        : "data:pull failed: log in with `npx wrangler login` (see README → Global runs and high scores).",
    );
    process.exit(1);
  }
  return JSON.parse(result.stdout)[0].results;
}

const runs = [];
let skipped = 0;
let cursor = { receivedAt: "", id: "" };
for (;;) {
  const page = query(
    `SELECT id, record, received_at FROM runs WHERE hidden_reason IS NULL AND ` +
      `(received_at > ${quote(cursor.receivedAt)} OR (received_at = ${quote(cursor.receivedAt)} AND id > ${quote(cursor.id)})) ` +
      `ORDER BY received_at, id LIMIT ${PAGE_SIZE}`,
  );
  for (const row of page) {
    try {
      runs.push(JSON.parse(row.record));
    } catch {
      skipped += 1;
    }
  }
  if (page.length < PAGE_SIZE) {
    break;
  }
  const last = page.at(-1);
  cursor = { receivedAt: last.received_at, id: last.id };
}

const exportedAt = new Date().toISOString();
const body = `${JSON.stringify({ exportedAt, source: "pac-rogue", runs })}\n`;
mkdirSync(outDir, { recursive: true });
const dated = join(outDir, `runs-${exportedAt.slice(0, 10)}.json`);
writeFileSync(dated, body);
writeFileSync(join(outDir, "latest.json"), body);
console.log(
  `Pulled ${runs.length} runs${skipped > 0 ? ` (${skipped} unparseable skipped)` : ""} from ${local ? "the local" : "the remote"} database.`,
);
console.log(`Wrote ${dated} and data-exports/latest.json. Open /data and choose GLOBAL (PULLED).`);
