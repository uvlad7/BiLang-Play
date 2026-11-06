import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./build-site.mjs", import.meta.url));
const committed = JSON.parse(
  readFileSync(fileURLToPath(new URL("../site/updates/main.json", import.meta.url)), "utf8"),
);

test("the site embeds the committed update file and serves it as it is", () => {
  const output = mkdtempSync(join(tmpdir(), "site-"));
  execFileSync(process.execPath, [script, output], { stdio: "pipe", env: { PATH: process.env.PATH } });
  const data = readFileSync(join(output, "site-data.js"), "utf8");
  const embedded = JSON.parse(data.replace(/^window\.BILANGPLAY_SITE_DATA = /, "").replace(/;\n$/, ""));
  assert.deepEqual(embedded.updates, committed);
  assert.match(embedded.changelogs.en, /^# /m);
  assert.deepEqual(JSON.parse(readFileSync(join(output, "updates", "main.json"), "utf8")), committed);
});
