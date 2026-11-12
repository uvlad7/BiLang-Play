#!/usr/bin/env node
// Build a small static NuGet v3 feed for the generated Chocolatey package.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { compareVersions } from "./updates.mjs";

const packageId = "bilangplay";

/** @param {string} path @param {unknown} value */
function json(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Add a version to the feed: its package is built into the flat container and
 * the version joins `versions.json` (the list of every version the feed
 * serves, kept in git, with when each was published). Every other file of the
 * feed, the service index, the version lists, registrations, and search, is
 * rewritten from that list, so the feed keeps all its versions and Chocolatey
 * can install an older one with `--version`.
 * @param {string} version @param {string} source @param {string} output
 * @param {string} [published] when this version was published (ISO 8601)
 */
export function buildFeed(version, source, output, published = new Date().toISOString()) {
  const root = resolve(output);
  const stage = join(root, ".stage");
  const v3 = join(root, "v3");
  const lowerVersion = version.toLowerCase();
  const filename = `${packageId}.${lowerVersion}.nupkg`;

  const listPath = join(root, "versions.json");
  const listed = existsSync(listPath) ? JSON.parse(readFileSync(listPath, "utf8")) : [];
  const versions = [...listed.filter((entry) => entry.version.toLowerCase() !== lowerVersion), { version, published }].sort(
    (a, b) => compareVersions(a.version, b.version),
  );
  json(listPath, versions);

  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  cpSync(join(source, "bilangplay.nuspec"), join(stage, "bilangplay.nuspec"));
  mkdirSync(join(stage, "tools"), { recursive: true });
  cpSync(join(source, "tools", "chocolateyinstall.ps1"), join(stage, "tools", "chocolateyinstall.ps1"));
  const packageDir = join(v3, "flatcontainer", packageId, lowerVersion);
  rmSync(packageDir, { recursive: true, force: true });
  mkdirSync(packageDir, { recursive: true });
  execFileSync("zip", ["-q", "-r", join(packageDir, filename), "."], { cwd: stage });
  rmSync(stage, { recursive: true, force: true });

  writeFeedIndexes(root);
}

/**
 * Rewrite every file of the feed that is derived from `versions.json`: the
 * service index, the version list, registrations, and search. The packages
 * in the flat container stay as they were built.
 * @param {string} output the directory with `versions.json` and `v3/`
 */
export function writeFeedIndexes(output) {
  const root = resolve(output);
  const v3 = join(root, "v3");
  const base = "https://uvlad7.github.io/BiLang-Play/chocolatey/v3";
  const registration = `${base}/registration/${packageId}`;
  const versions = JSON.parse(readFileSync(join(root, "versions.json"), "utf8"));
  rmSync(join(v3, "registration"), { recursive: true, force: true });
  rmSync(join(v3, "search"), { recursive: true, force: true });
  const entry = (item) => {
    const lower = item.version.toLowerCase();
    const catalogEntry = {
      "@id": `${registration}/${lower}.json#catalogEntry`,
      "@type": "PackageDetails",
      id: packageId,
      version: item.version,
      authors: "Uladzimir Ulyanitski (uvlad7)",
      description: "Installs BiLang Play's NSIS installer.",
      summary: "Local-first video player for language learners",
      projectUrl: "https://github.com/uvlad7/BiLang-Play",
      published: item.published,
      listed: true,
    };
    return {
      "@id": `${registration}/${lower}.json`,
      catalogEntry,
      packageContent: `${base}/flatcontainer/${packageId}/${lower}/${packageId}.${lower}.nupkg`,
    };
  };
  const leaves = versions.map(entry);
  const newest = leaves.at(-1);
  json(join(v3, "index.json"), {
    version: "3.0.0",
    resources: [
      { "@id": `${base}/flatcontainer/`, "@type": "PackageBaseAddress/3.0.0" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl/3.0.0-beta" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl/3.0.0-rc" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl/3.4.0" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl/3.6.0" },
      { "@id": `${base}/search/query`, "@type": "SearchQueryService" },
      // NuGet 6.4 (bundled by Chocolatey 2.7) resolves ListResource through
      // these historical identifiers, not SearchQueryService/3.5.0.
      { "@id": `${base}/search/query`, "@type": "SearchQueryService/3.0.0-beta" },
      { "@id": `${base}/search/query`, "@type": "SearchQueryService/3.4.0" },
      { "@id": `${base}/search/query`, "@type": "SearchQueryService/3.5.0" },
    ],
  });
  json(join(v3, "flatcontainer", packageId, "index.json"), {
    versions: versions.map((item) => item.version.toLowerCase()),
  });
  json(join(v3, "registration", packageId, "index.json"), {
    count: 1,
    items: [{
      "@id": `${registration}/index.json#page/0`,
      count: leaves.length,
      lower: versions[0].version.toLowerCase(),
      upper: versions.at(-1).version.toLowerCase(),
      items: leaves,
    }],
  });
  for (const leaf of leaves) {
    json(join(v3, "registration", packageId, `${leaf.catalogEntry.version.toLowerCase()}.json`), leaf);
  }
  json(join(v3, "search", "query"), {
    totalHits: 1,
    data: [{
      ...newest.catalogEntry,
      "@id": `${registration}/index.json`,
      "@type": "Package",
      registration: `${registration}/index.json`,
      versions: leaves.map((leaf) => ({ "@id": leaf["@id"], version: leaf.catalogEntry.version, downloads: 0 })),
      packageTypes: [{ name: "ChocolateyPackage" }],
    }],
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , version, source = "chocolatey", output = "chocolatey", published] = process.argv;
  if (!version) {
    throw new Error("usage: build-chocolatey-feed.mjs <version> [source-dir] [output-dir] [published]");
  }
  buildFeed(version, source, output, published);
}
