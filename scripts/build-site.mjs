#!/usr/bin/env node
// Build the static Pages payload from the newest published release. The site
// must not depend on a visitor's network access to GitHub's API.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? "_site");
const repository = process.env.GITHUB_REPOSITORY ?? "uvlad7/BiLang-Play";
const event = process.env.GITHUB_EVENT_PATH
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
  : null;

if (event?.release?.draft) throw new Error("refusing to deploy a draft release");

const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`, {
  headers: {
    Accept: "application/vnd.github+json",
    ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
  },
});
if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
const releases = await response.json();
const newest = releases.find((release) => !release.draft) ?? null;
if (event?.release && newest?.id !== event.release.id) {
  throw new Error("the published release is not the newest non-draft release");
}

const release = newest && {
  tag_name: newest.tag_name,
  published_at: newest.published_at,
  prerelease: newest.prerelease,
  html_url: newest.html_url,
  assets: newest.assets.map(({ name, size, browser_download_url }) => ({
    name,
    size,
    browser_download_url,
  })),
};
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
  `window.BILANGPLAY_SITE_DATA = ${JSON.stringify({ release, changelogs })};\n`,
);
