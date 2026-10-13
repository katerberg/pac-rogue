import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BUDGET_BYTES = 140_000;

const files = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => file !== "" && existsSync(file));

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9 _-]/g, "")
    .trim()
    .replace(/ /g, "-");

const anchorsOf = (file) =>
  new Set(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => /^#{1,6} /.test(line))
      .map((line) => slug(line.replace(/^#+ /, ""))),
  );

const problems = [];
let total = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  total += Buffer.byteLength(text);
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const [target, anchor] = match[1].split("#");
    if (/^[a-z]+:/.test(target) || (target === "" && anchor === undefined)) {
      continue;
    }
    const path = target === "" ? file : join(dirname(file), target);
    if (!existsSync(path)) {
      problems.push(`${file}: missing file ${match[1]}`);
    } else if (anchor && path.endsWith(".md") && !anchorsOf(path).has(anchor)) {
      problems.push(`${file}: missing anchor ${match[1]}`);
    }
  }
}

if (total > BUDGET_BYTES) {
  problems.push(
    `markdown is ${total} bytes, over the ${BUDGET_BYTES} budget: link to code instead of restating values`,
  );
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`docs ok: ${files.length} files, ${total} bytes`);
