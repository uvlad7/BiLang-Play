#!/usr/bin/env node
// Build the static Pages payload. The download and install sections come
// from the update file, site/updates/main.json, which a release's Pages run
// writes (package-managers/updates.mjs); the page embeds it and the
// changelogs, so a visitor makes no requests to GitHub's API.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { SCHEMA } from "../package-managers/updates.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? "_site");
const event = process.env.GITHUB_EVENT_PATH
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
  : null;

if (event?.release?.draft) throw new Error("refusing to deploy a draft release");

const updatesPath = join(root, "site", "updates", "main.json");
const updates = existsSync(updatesPath) ? JSON.parse(readFileSync(updatesPath, "utf8")) : null;
if (updates && updates.schema !== SCHEMA) {
  throw new Error(`${updatesPath} is ${updates.schema}, not ${SCHEMA}`);
}
const changelogs = {
  en: readFileSync(join(root, "CHANGELOG.md"), "utf8"),
  ru: readFileSync(join(root, "CHANGELOG.ru.md"), "utf8"),
};

mkdirSync(output, { recursive: true });
cpSync(join(root, "site"), output, { recursive: true });
cpSync(join(root, "screenshots"), join(output, "screenshots"), { recursive: true });
if (existsSync(join(root, "chocolatey"))) {
  cpSync(join(root, "chocolatey"), join(output, "chocolatey"), { recursive: true });
}
writeFileSync(
  join(output, "site-data.js"),
  `window.BILANGPLAY_SITE_DATA = ${JSON.stringify({ updates, changelogs })};\n`,
);
