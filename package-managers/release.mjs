#!/usr/bin/env node
// Render everything a release changes in this repository, from the release's
// files in one directory (the ones the release job uploads, or downloaded
// from a published release):
//
//   node package-managers/release.mjs <version> <release-assets-dir> [published-at [repository-root]]
//
// - the Homebrew cask, the Scoop manifest, and the Chocolatey source
//   (render.mjs), with the files' SHA-256 hashes;
// - the version's entry in versions.json, the list of every published
//   version and the channels it installs through (versions.mjs);
// - the Chocolatey feed, which keeps every version that list gives it;
// - the release record (release.json) the site's update file is built from,
//   unless a newer version is recorded.
//
// The private repository's package workflow runs it on a checkout of this
// repository (PACKAGING.md, "Releases"); the changes go to a branch and a
// pull request, and the draft release targets the branch's commit, so the
// tag, once the release is published, holds the sources of its own version
// and a package manager can check the tag out to install it.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildFeed } from "./build-chocolatey-feed.mjs";
import { artifacts, sources } from "./render.mjs";
import { nextRecord } from "./updates.mjs";
import { readVersions, through, versionEntry, withVersion, writeVersions } from "./versions.mjs";

const owner = "uvlad7";
const repository = "BiLang-Play";

/**
 * The release object the record is made of, from the files to upload: a
 * release not yet published has no API object, and its links are known.
 * @param {string} version @param {string} directory @param {string} publishedAt
 */
export function releaseFromFiles(version, directory, publishedAt) {
  const tag = `v${version}`;
  const base = `https://github.com/${owner}/${repository}/releases`;
  return {
    tag_name: tag,
    published_at: publishedAt,
    html_url: `${base}/tag/${tag}`,
    assets: readdirSync(directory)
      .filter((name) => statSync(join(directory, name)).isFile())
      .sort()
      .map((name) => ({
        name,
        size: statSync(join(directory, name)).size,
        browser_download_url: `${base}/download/${tag}/${name}`,
      })),
  };
}

/**
 * @param {string} root this repository's checkout
 * @param {string} version @param {string} directory @param {string} publishedAt
 */
export function release(root, version, directory, publishedAt) {
  // The record first: it refuses a release whose assets or license are wrong
  // before anything is written.
  const recordPath = join(root, "release.json");
  const recorded = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : null;
  const published = releaseFromFiles(version, directory, publishedAt);
  const record = nextRecord(published, recorded);
  const files = artifacts(version, directory);
  const versions = withVersion(readVersions(root), versionEntry(version, publishedAt, published.assets));
  writeVersions(root, versions);
  for (const [relative, text] of sources(version, files)) {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  buildFeed(version, join(root, "chocolatey"), join(root, "chocolatey"), through(versions, "chocolatey"));
  if (record) writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  else console.log(`release.json records a newer version than ${version}; left as it is`);
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , version, directory, publishedAt = new Date().toISOString(), suppliedRoot] = process.argv;
  if (!version || !directory) {
    throw new Error("usage: release.mjs <version> <release-assets-dir> [published-at [repository-root]]");
  }
  // This repository's checkout, or another one of it (an older version's
  // commit, to give its tag the sources of its own version).
  const root = resolve(suppliedRoot ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  release(root, version, resolve(directory), publishedAt);
  console.log(`Rendered ${version} into ${root}`);
}
