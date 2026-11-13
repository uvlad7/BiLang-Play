// Every published version, in `versions.json` at the repository's root: when
// it was published, the channels it installs through, and its files (the
// ones the site offers, with their sizes). Each release adds its entry
// (`release.mjs`); the Chocolatey feed serves the versions that list
// `chocolatey`, and the site's download picker and each package manager's
// "Install an older version" offer the versions that list their channel.
//
// Channels: `downloads` (the release's files), and the package managers by
// the names of `CHANNELS` in `instructions.mjs`: `brew-macos`, `brew-linux`,
// `scoop`, `chocolatey`. A package manager installs an older version from its
// tag (Homebrew's tap and Scoop's bucket check it out) or from the feed
// (Chocolatey), so a version lists one only when its tag has that manager's
// sources, or the feed has its package.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compareVersions, FILES, releaseFiles, SOURCES } from "./updates.mjs";

/** The channels every release from now on installs through. */
export const RELEASE_CHANNELS = ["downloads", "brew-macos", "brew-linux", "scoop", "chocolatey"];

const DOWNLOADS = "https://github.com/uvlad7/BiLang-Play/releases";

/**
 * @typedef {{ version: string, published: string, channels: string[],
 *   assets: { name: string, size: number }[] }} Entry
 */

/** @param {string} root this repository's checkout @returns {Entry[]} */
export function readVersions(root) {
  const path = join(root, "versions.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}

/** @param {string} root @param {Entry[]} versions */
export function writeVersions(root, versions) {
  writeFileSync(join(root, "versions.json"), `${JSON.stringify(versions, null, 2)}\n`);
}

/**
 * The list with `entry` in it, in place of an entry for the same version,
 * oldest first.
 * @param {Entry[]} versions @param {Entry} entry
 */
export function withVersion(versions, entry) {
  const lower = entry.version.toLowerCase();
  return [...versions.filter((item) => item.version.toLowerCase() !== lower), entry].sort((a, b) =>
    compareVersions(a.version, b.version),
  );
}

/**
 * A release's entry, from its files: only the ones the site offers (the
 * packages and the bundled libraries' sources), with their sizes.
 * @param {string} version @param {string} published
 * @param {{ name: string, size: number }[]} assets @param {string[]} [channels]
 * @returns {Entry}
 */
export function versionEntry(version, published, assets, channels = RELEASE_CHANNELS) {
  const offered = (name) =>
    Object.values(FILES).some((file) => file.name(version) === name) ||
    SOURCES.some((source) => source.test(name));
  return {
    version,
    published,
    channels,
    assets: assets.filter((asset) => offered(asset.name)).map(({ name, size }) => ({ name, size })),
  };
}

/** The versions that install through `channel`, oldest first. @param {Entry[]} versions */
export const through = (versions, channel) => versions.filter((entry) => entry.channels.includes(channel));

/**
 * What the site shows of a version: its release page, its files by kind (as
 * the update file has them), and the sources of its bundled libraries.
 * @param {Entry} entry
 */
export function siteVersion(entry) {
  const tag = `v${entry.version}`;
  const { files, sources } = releaseFiles({
    tag_name: tag,
    assets: entry.assets.map((asset) => ({
      ...asset,
      browser_download_url: `${DOWNLOADS}/download/${tag}/${asset.name}`,
    })),
  });
  return {
    version: entry.version,
    published: entry.published,
    release: `${DOWNLOADS}/tag/${tag}`,
    channels: entry.channels,
    files,
    sources,
  };
}
