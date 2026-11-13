#!/usr/bin/env node
// Build the static Pages payload. The update file, updates/main.json, is
// rendered from the release record (release.json, which a release's pull
// request updates) and the instructions (package-managers/updates.mjs); the page
// embeds it and the changelogs, so a visitor makes no requests to GitHub's
// API, and fills its downloads and its install and uninstall tabs from it.
// It embeds every published version too (versions.json), for the download
// picker and each package manager's "Install an older version".
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { renderUpdates } from "../package-managers/updates.mjs";
import { readVersions, siteVersion } from "../package-managers/versions.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? "_site");
const recordPath = join(root, "release.json");
const updates = existsSync(recordPath)
  ? renderUpdates(JSON.parse(readFileSync(recordPath, "utf8")))
  : null;
// Newest first, as the pickers list them.
const versions = readVersions(root).map(siteVersion).reverse();
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
if (updates) {
  mkdirSync(join(output, "updates"), { recursive: true });
  writeFileSync(join(output, "updates", "main.json"), `${JSON.stringify(updates, null, 2)}\n`);
}
writeFileSync(
  join(output, "site-data.js"),
  `window.BILANGPLAY_SITE_DATA = ${JSON.stringify({ updates, versions, changelogs })};\n`,
);
