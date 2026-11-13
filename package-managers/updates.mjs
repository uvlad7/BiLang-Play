#!/usr/bin/env node
// The update file, `updates/main.json` on the site: the newest version, its
// files, how each install channel takes it (the app's update notice, the
// app's docs/UPDATE-NOTICES.md), and the site's install and uninstall
// steps, all from `instructions.mjs`. The site build renders it from the
// committed release record, `release.json`, which a release's Pages run
// writes:
//
//   node package-managers/updates.mjs <github-release.json> release.json
//
// <github-release.json> is the GitHub API's release object
// (`gh api repos/<owner>/<repo>/releases/tags/<tag>`). The record keeps the
// license id the release came under (`license.mjs`); a release under
// another id than the recorded one needs a new major version.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CHANNELS, INSTALL, UNINSTALL } from "./instructions.mjs";
import { LICENSE, LICENSES } from "./license.mjs";

export const SCHEMA = "bilangplay.updates/1";
const SITE = "https://uvlad7.github.io/BiLang-Play";
const DOWNLOADS = "https://github.com/uvlad7/BiLang-Play/releases/download";

/**
 * The release's packages, by kind (every one must be there): each file's
 * name, and its title, which the site's download buttons and the app's
 * update notice show.
 * @type {Record<string, { name: (version: string) => string, title: { en: string, ru: string } }>}
 */
export const FILES = {
  "windows-setup": {
    name: (v) => `bilangplay-${v}-windows-x64-setup.exe`,
    title: { en: "NSIS installer (.exe)", ru: "Установщик NSIS (.exe)" },
  },
  "windows-zip": {
    name: (v) => `bilangplay-${v}-windows-x64.zip`,
    title: { en: "Portable app (.zip)", ru: "Портативное приложение (.zip)" },
  },
  "macos-dmg": {
    name: (v) => `bilangplay-${v}-macos-arm64.dmg`,
    title: { en: "Disk image (.dmg)", ru: "Образ диска (.dmg)" },
  },
  "macos-zip": {
    name: (v) => `bilangplay-${v}-macos-arm64.zip`,
    title: { en: "App (.app in .zip)", ru: "Приложение (.app в .zip)" },
  },
  appimage: {
    name: (v) => `bilangplay-${v}-linux-x86_64.AppImage`,
    title: { en: "App image (.AppImage)", ru: "Образ приложения (.AppImage)" },
  },
  deb: {
    name: (v) => `bilangplay-${v}-linux-amd64.deb`,
    title: { en: "Debian/Ubuntu package (.deb)", ru: "Пакет Debian/Ubuntu (.deb)" },
  },
  "linux-tar": {
    name: (v) => `bilangplay-${v}-linux-x64.tar.gz`,
    title: { en: "Portable app (.tar.gz)", ru: "Портативное приложение (.tar.gz)" },
  },
};

/** The bundled libraries' sources and their build script (LGPL). */
export const SOURCES = [/^ffmpeg-.*\.tar\.xz$/, /^opus-.*\.tar\.gz$/, /^build-ffmpeg\.mjs$/];

/**
 * Semantic-version precedence: negative, zero, or positive as `a` is below,
 * equal to, or above `b` (build metadata ignored).
 * @param {string} a @param {string} b
 */
export function compareVersions(a, b) {
  const parse = (text) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
    if (!match) throw new Error(`not a version: ${text}`);
    return { core: match.slice(1, 4).map(Number), pre: match[4]?.split(".") ?? [] };
  };
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length;
  for (let i = 0; i < Math.min(x.pre.length, y.pre.length); i++) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === q) continue;
    const [pn, qn] = [/^\d+$/.test(p), /^\d+$/.test(q)];
    if (pn && qn) return Number(p) - Number(q);
    if (pn !== qn) return pn ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return x.pre.length - y.pre.length;
}

/**
 * A release's files by kind (each one must be there), with their titles, and
 * the sources of its bundled libraries.
 * @param {{ tag_name: string,
 *   assets: { name: string, size: number, browser_download_url: string }[] }} release
 */
export function releaseFiles(release) {
  const version = release.tag_name.replace(/^v/, "");
  compareVersions(version, version);
  const base = `${DOWNLOADS}/v${version}/`;
  const file = (asset) => {
    if (asset.browser_download_url !== base + asset.name) {
      throw new Error(`unexpected download link for ${asset.name}`);
    }
    return { name: asset.name, url: asset.browser_download_url, size: asset.size };
  };
  const files = Object.fromEntries(
    Object.entries(FILES).map(([kind, { name, title }]) => {
      const asset = release.assets.find((a) => a.name === name(version));
      if (!asset) throw new Error(`the release has no ${name(version)}`);
      return [kind, { ...file(asset), title }];
    }),
  );
  const sources = release.assets.filter((a) => SOURCES.some((s) => s.test(a.name))).map(file);
  return { version, files, sources };
}

/**
 * The update file for a published release: a release record, or a GitHub
 * API release object (under the license the next release comes under).
 * @param {{ tag_name: string, published_at: string, html_url: string, draft?: boolean,
 *   license?: string,
 *   assets: { name: string, size: number, browser_download_url: string }[] }} release
 */
export function renderUpdates(release) {
  if (release.draft) throw new Error("a draft release is not published");
  const license = release.license ?? LICENSE;
  if (!Object.hasOwn(LICENSES, license)) throw new Error(`license.mjs has no license ${license}`);
  const { version, files, sources } = releaseFiles(release);
  const fill = (text) =>
    text
      .replaceAll("{version}", version)
      .replace(/\{(name|url):([a-z-]+)\}/g, (_, field, kind) => {
        if (!files[kind]) throw new Error(`unknown file kind: ${kind}`);
        return files[kind][field];
      });
  // Every string in the instructions, placeholders filled.
  const filled = (value) =>
    typeof value === "string"
      ? fill(value)
      : Array.isArray(value)
        ? value.map(filled)
        : value && typeof value === "object"
          ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, filled(item)]))
          : value;
  const channels = Object.fromEntries(
    Object.entries(CHANNELS).map(([name, channel]) => [
      name,
      {
        ...(channel.download
          ? {
              downloads: channel.download.map((kind) => ({
                url: files[kind].url,
                title: files[kind].title,
              })),
            }
          : {}),
        ...(channel.warning ? { warning: filled(channel.warning) } : {}),
        ...(channel.update ? { update: filled(channel.update) } : {}),
        ...(channel.hold ? { hold: filled(channel.hold) } : {}),
      },
    ]),
  );
  return {
    schema: SCHEMA,
    version,
    published: release.published_at,
    release: release.html_url,
    notes: `${SITE}/#v${version}`,
    files,
    sources,
    channels,
    install: filled(INSTALL),
    uninstall: filled(UNINSTALL),
    // The terms this version came under; a copy released under others says so.
    license: { id: license, text: LICENSES[license], url: `${SITE}/#license` },
  };
}

/**
 * What the update file needs of a GitHub API release object, with the
 * license it comes under.
 * @param {{ tag_name: string, published_at: string, html_url: string, draft?: boolean,
 *   assets: { name: string, size: number, browser_download_url: string }[] }} release
 */
export function releaseRecord(release) {
  renderUpdates({ ...release, license: LICENSE });
  const { tag_name, published_at, html_url, assets } = release;
  return {
    tag_name,
    published_at,
    html_url,
    license: LICENSE,
    assets: assets.map(({ name, size, browser_download_url }) => ({ name, size, browser_download_url })),
  };
}

const versionOf = (record) => record.tag_name.replace(/^v/, "");
const major = (version) => Number(version.split(".")[0]);

/**
 * The record to write for a release, given the one recorded (or null): null
 * when the recorded version is newer (a release published late, for an
 * earlier version). Throws when the release comes under another license
 * than the recorded one without a new major version (docs/UPDATE-NOTICES.md
 * in the app).
 * @param {Parameters<typeof releaseRecord>[0]} release
 * @param {{ tag_name: string, license?: string } | null} recorded
 */
export function nextRecord(release, recorded) {
  const record = releaseRecord(release);
  if (!recorded) return record;
  const [version, current] = [versionOf(record), versionOf(recorded)];
  if (compareVersions(version, current) < 0) return null;
  // A record from before licenses were recorded has nothing to compare.
  if (recorded.license && recorded.license !== record.license && major(version) <= major(current)) {
    throw new Error(
      `${version} comes under ${record.license}, ${current} under ${recorded.license}: ` +
        `the license changes only with a new major version (above ${major(current)})`,
    );
  }
  return record;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , releasePath, outputPath] = process.argv;
  if (!releasePath || !outputPath) {
    throw new Error("usage: updates.mjs <github-release.json> <release.json>");
  }
  const release = JSON.parse(readFileSync(releasePath, "utf8"));
  const output = resolve(outputPath);
  const recorded = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : null;
  const record = nextRecord(release, recorded);
  if (!record) {
    console.log(`${output} records ${versionOf(recorded)}, newer than ${versionOf(release)}; left as it is`);
    process.exit(0);
  }
  writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Recorded ${versionOf(record)} in ${output}`);
}
