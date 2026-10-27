#!/usr/bin/env node
// Build a small static NuGet v3 feed for the generated Chocolatey package.
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const packageId = "bilangplay";

/** @param {string} path @param {unknown} value */
function json(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** @param {string} version @param {string} source @param {string} output */
export function buildFeed(version, source, output) {
  const root = resolve(output);
  const stage = join(root, ".stage");
  const v3 = join(root, "v3");
  const base = "https://uvlad7.github.io/BiLang-Play/chocolatey/v3";
  const lowerVersion = version.toLowerCase();
  const filename = `${packageId}.${lowerVersion}.nupkg`;
  const flat = `${base}/flatcontainer/${packageId}/${lowerVersion}`;
  const registration = `${base}/registration/${packageId}`;

  rmSync(stage, { recursive: true, force: true });
  rmSync(v3, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  cpSync(join(source, "bilangplay.nuspec"), join(stage, "bilangplay.nuspec"));
  mkdirSync(join(stage, "tools"), { recursive: true });
  cpSync(join(source, "tools", "chocolateyinstall.ps1"), join(stage, "tools", "chocolateyinstall.ps1"));
  mkdirSync(join(v3, "flatcontainer", packageId, lowerVersion), { recursive: true });
  const packagePath = join(v3, "flatcontainer", packageId, lowerVersion, filename);
  execFileSync("zip", ["-q", "-r", packagePath, "."], { cwd: stage });
  rmSync(stage, { recursive: true, force: true });

  const packageUrl = `${flat}/${filename}`;
  const packageDigest = createHash("sha512").update(readFileSync(packagePath)).digest("base64");
  const catalogEntry = {
    "@id": `${registration}/${lowerVersion}.json#catalogEntry`,
    "@type": "PackageDetails",
    id: packageId,
    version,
    authors: "Uladzimir Ulyanitski (uvlad7)",
    description: "Installs BiLang Play's NSIS installer.",
    summary: "Local-first video player for language learners",
    projectUrl: "https://github.com/uvlad7/BiLang-Play",
    published: new Date().toISOString(),
    listed: true,
  };
  const leaf = { "@id": `${registration}/${lowerVersion}.json`, catalogEntry, packageContent: packageUrl };
  json(join(v3, "index.json"), {
    version: "3.0.0",
    resources: [
      { "@id": `${base}/flatcontainer/`, "@type": "PackageBaseAddress/3.0.0" },
      { "@id": `${base}/registration/`, "@type": "RegistrationsBaseUrl/3.6.0" },
      { "@id": `${base}/search/query`, "@type": "SearchQueryService/3.5.0" },
    ],
  });
  json(join(v3, "flatcontainer", packageId, "index.json"), { versions: [lowerVersion] });
  writeFileSync(`${packagePath}.sha512`, packageDigest);
  json(join(v3, "registration", packageId, "index.json"), {
    count: 1,
    items: [{ "@id": `${registration}/index.json#page/0`, count: 1, items: [leaf] }],
  });
  json(join(v3, "registration", packageId, `${lowerVersion}.json`), leaf);
  json(join(v3, "search", "query"), { totalHits: 1, data: [{ ...catalogEntry, versions: [{ version: lowerVersion }] }] });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , version, source = "chocolatey", output = "chocolatey"] = process.argv;
  if (!version) throw new Error("usage: build-chocolatey-feed.mjs <version> [source-dir] [output-dir]");
  buildFeed(version, source, output);
}
