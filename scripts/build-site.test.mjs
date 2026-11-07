import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderUpdates } from "../package-managers/updates.mjs";

const script = fileURLToPath(new URL("./build-site.mjs", import.meta.url));
const record = JSON.parse(readFileSync(fileURLToPath(new URL("../release.json", import.meta.url)), "utf8"));

test("the site serves and embeds the update file rendered from the release record", () => {
  const output = mkdtempSync(join(tmpdir(), "site-"));
  execFileSync(process.execPath, [script, output], { stdio: "pipe", env: { PATH: process.env.PATH } });
  const expected = renderUpdates(record);
  const data = readFileSync(join(output, "site-data.js"), "utf8");
  const embedded = JSON.parse(data.replace(/^window\.BILANGPLAY_SITE_DATA = /, "").replace(/;\n$/, ""));
  assert.deepEqual(embedded.updates, expected);
  assert.match(embedded.changelogs.en, /^# /m);
  assert.deepEqual(JSON.parse(readFileSync(join(output, "updates", "main.json"), "utf8")), expected);
});
