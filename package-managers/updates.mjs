#!/usr/bin/env node
// Render the update file, `site/updates/main.json`, from a published
// release: the version, its files, and how each install channel takes it.
// The app's update notice reads it (the app's docs/UPDATE-NOTICES.md), and
// the site's downloads and update steps come from it.
//
//   node package-managers/updates.mjs <release.json> <main.json>
//
// <release.json> is the GitHub API's release object
// (`gh api repos/<owner>/<repo>/releases/tags/<tag>`).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const SCHEMA = "bilangplay.updates/1";
const SITE = "https://uvlad7.github.io/BiLang-Play";
const DOWNLOADS = "https://github.com/uvlad7/BiLang-Play/releases/download";

/** The release's packages, by kind; every one must be there. */
export const FILES = {
  "windows-setup": (v) => `bilangplay-${v}-windows-x64-setup.exe`,
  "windows-zip": (v) => `bilangplay-${v}-windows-x64.zip`,
  "macos-dmg": (v) => `bilangplay-${v}-macos-arm64.dmg`,
  "macos-zip": (v) => `bilangplay-${v}-macos-arm64.zip`,
  appimage: (v) => `bilangplay-${v}-linux-x86_64.AppImage`,
  deb: (v) => `bilangplay-${v}-linux-amd64.deb`,
  "linux-tar": (v) => `bilangplay-${v}-linux-x64.tar.gz`,
};

/** The bundled libraries' sources and their build script (LGPL). */
const SOURCES = [/^ffmpeg-.*\.tar\.xz$/, /^opus-.*\.tar\.gz$/, /^build-ffmpeg\.mjs$/];

/**
 * Each way of installing the app and what its update notice shows: the
 * new version's `download` (a kind of `FILES`), and the `update` steps. The
 * site shows the same steps under each channel's install instructions,
 * which are its own. A step has its `commands`, a `description` said
 * before them and a `warning` said with them (plain text, in each language
 * the site and the app speak), and `elevated` when it needs an
 * administrator shell; a step that is another way of doing the same says
 * so, "Or …". The released app shows what this file says, so a warning can
 * be added or changed for copies already out. Placeholders in commands:
 * `{version}`, `{name:<kind>}`, `{url:<kind>}`.
 */
export const CHANNELS = {
  // `brew upgrade` fetches the tap first only when Homebrew's auto-update
  // is on and due, so the tap is always fetched here.
  brew: {
    update: [
      {
        description: {
          en: "Fetch only this tap, leaving Homebrew as it is, then upgrade BiLang Play:",
          ru: "Получите только этот tap, не обновляя Homebrew, затем обновите BiLang Play:",
        },
        commands: [
          'git -C "$(brew --repository uvlad7/bilang-play)" pull --ff-only',
          "HOMEBREW_NO_AUTO_UPDATE=1 brew upgrade --cask uvlad7/bilang-play/bilang-play",
        ],
      },
      {
        description: {
          en: "Or fetch the newest Homebrew and every tap's package lists (nothing installed is upgraded), then upgrade BiLang Play:",
          ru: "Или получите свежий Homebrew и списки пакетов всех tap'ов (установленное при этом не обновляется), затем обновите BiLang Play:",
        },
        commands: ["brew update", "brew upgrade --cask uvlad7/bilang-play/bilang-play"],
      },
    ],
  },
  // `scoop update <app>` syncs the buckets only when Scoop itself is old.
  scoop: {
    update: [
      {
        description: {
          en: "Fetch the newest Scoop and its buckets (nothing installed is upgraded), then upgrade BiLang Play:",
          ru: "Получите свежий Scoop и его bucket'ы (установленное при этом не обновляется), затем обновите BiLang Play:",
        },
        warning: {
          en: "Scoop warns before it clears the download mark from the new files.",
          ru: "Scoop предупредит, прежде чем снять метку о скачанном файле с новых файлов.",
        },
        commands: ["scoop update", "scoop update bilang-play"],
      },
    ],
  },
  // Chocolatey keeps its packages in a folder shared by every user
  // (C:\ProgramData\chocolatey), which only an administrator may change.
  chocolatey: {
    update: [
      {
        description: {
          en: "In an administrator shell (Chocolatey keeps its packages in a folder shared by every user):",
          ru: "В оболочке администратора (Chocolatey хранит пакеты в общей для всех пользователей папке):",
        },
        warning: {
          en: "Chocolatey warns before it clears the download mark from the verified installer and the installed files.",
          ru: "Chocolatey предупредит, прежде чем снять метку о скачанном файле с проверенного установщика и установленных файлов.",
        },
        commands: ["choco upgrade bilangplay --source bilangplay --pre -y"],
        elevated: true,
      },
    ],
  },
  // No APT repository: download, then install the file. /tmp is readable
  // by APT's sandbox user, so it does not warn.
  deb: {
    download: "deb",
    update: [
      {
        description: {
          en: "Download the new package and install it (there is no APT repository, so apt upgrade does not see new versions):",
          ru: "Скачайте новый пакет и установите его (репозитория APT нет, поэтому apt upgrade новых версий не видит):",
        },
        commands: ["wget -O /tmp/bilangplay.deb {url:deb}", "sudo apt install /tmp/bilangplay.deb"],
      },
    ],
  },
  appimage: { download: "appimage" },
  "linux-tar": { download: "linux-tar" },
  nsis: { download: "windows-setup" },
  "windows-zip": { download: "windows-zip" },
  macos: {
    download: "macos-dmg",
    update: [
      {
        description: {
          en: "Replace the app in Applications with the new one, then remove its download mark:",
          ru: "Замените приложение в «Программах» новым, затем снимите с него пометку о скачивании:",
        },
        commands: ['xattr -dr com.apple.quarantine "/Applications/BiLang Play.app"'],
      },
    ],
  },
};

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
    Object.entries(FILES).map(([kind, name]) => {
      const asset = release.assets.find((a) => a.name === name(version));
      if (!asset) throw new Error(`the release has no ${name(version)}`);
      return [kind, file(asset)];
    }),
  );
  const fill = (command) =>
    command
      .replaceAll("{version}", version)
      .replace(/\{(name|url):([a-z-]+)\}/g, (_, field, kind) => {
        if (!files[kind]) throw new Error(`unknown file kind: ${kind}`);
        return files[kind][field];
      });
  const channels = Object.fromEntries(
    Object.entries(CHANNELS).map(([name, channel]) => [
      name,
      {
        ...(channel.download ? { download: files[channel.download].url } : {}),
        ...(channel.update
          ? { update: channel.update.map((step) => ({ ...step, commands: step.commands.map(fill) })) }
          : {}),
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
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , releasePath, outputPath] = process.argv;
  if (!releasePath || !outputPath) {
    throw new Error("usage: updates.mjs <release.json> <main.json>");
  }
  const updates = renderUpdates(JSON.parse(readFileSync(releasePath, "utf8")));
  const output = resolve(outputPath);
  // A release older than the one the file names (one published late, for
  // an earlier version) leaves it as it is.
  if (existsSync(output)) {
    const current = JSON.parse(readFileSync(output, "utf8")).version;
    if (compareVersions(updates.version, current) < 0) {
      console.log(`${output} names ${current}, newer than ${updates.version}; left as it is`);
      process.exit(0);
    }
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(updates, null, 2)}\n`);
  console.log(`Wrote ${updates.version} to ${output}`);
}
