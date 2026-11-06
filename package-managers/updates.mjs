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
// (`gh api repos/<owner>/<repo>/releases/tags/<tag>`).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CHANNELS, INSTALL, UNINSTALL } from "./instructions.mjs";

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
const SOURCES = [/^ffmpeg-.*\.tar\.xz$/, /^opus-.*\.tar\.gz$/, /^build-ffmpeg\.mjs$/];

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
 * The update file for a published release.
 * @param {{ tag_name: string, published_at: string, html_url: string, draft?: boolean,
 *   assets: { name: string, size: number, browser_download_url: string }[] }} release
 */
export function renderUpdates(release) {
  if (release.draft) throw new Error("a draft release is not published");
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
    sources: release.assets.filter((a) => SOURCES.some((s) => s.test(a.name))).map(file),
    channels,
    install: filled(INSTALL),
    uninstall: filled(UNINSTALL),
  };
}

/**
 * What the update file needs of a GitHub API release object.
 * @param {{ tag_name: string, published_at: string, html_url: string, draft?: boolean,
 *   assets: { name: string, size: number, browser_download_url: string }[] }} release
 */
export function releaseRecord(release) {
  renderUpdates(release);
  const { tag_name, published_at, html_url, assets } = release;
  return {
    tag_name,
    published_at,
    html_url,
    assets: assets.map(({ name, size, browser_download_url }) => ({ name, size, browser_download_url })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , releasePath, outputPath] = process.argv;
  if (!releasePath || !outputPath) {
    throw new Error("usage: updates.mjs <github-release.json> <release.json>");
  }
  const record = releaseRecord(JSON.parse(readFileSync(releasePath, "utf8")));
  const version = record.tag_name.replace(/^v/, "");
  const output = resolve(outputPath);
  // A release older than the recorded one (one published late, for an
  // earlier version) leaves it as it is.
  if (existsSync(output)) {
    const current = JSON.parse(readFileSync(output, "utf8")).tag_name.replace(/^v/, "");
    if (compareVersions(version, current) < 0) {
      console.log(`${output} records ${current}, newer than ${version}; left as it is`);
      process.exit(0);
    }
  }
  writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Recorded ${version} in ${output}`);
}
