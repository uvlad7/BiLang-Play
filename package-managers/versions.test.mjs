import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FILES } from "./updates.mjs";
import { RELEASE_CHANNELS, siteVersion, through, versionEntry, withVersion } from "./versions.mjs";

const assets = (version) => [
  ...Object.values(FILES).map(({ name }) => ({ name: name(version), size: 10, browser_download_url: "x" })),
  { name: "ffmpeg-9.0.2.tar.xz", size: 2 },
  { name: "build-ffmpeg.mjs", size: 3 },
  { name: `bilangplay-${version}-macos-arm64.dmg.blockmap`, size: 1 },
  { name: "latest-mac.yml", size: 1 },
];

test("a version's entry keeps the files the site offers, with their sizes only", () => {
  const entry = versionEntry("1.0.0", "2026-01-01T00:00:00Z", assets("1.0.0"));
  assert.deepEqual(entry.channels, RELEASE_CHANNELS);
  assert.equal(entry.assets.length, Object.keys(FILES).length + 2);
  assert.ok(entry.assets.every((asset) => Object.keys(asset).join() === "name,size"));
  assert.ok(!entry.assets.some((asset) => /blockmap|\.yml$/.test(asset.name)));
});

test("the list keeps one entry per version, oldest first by version precedence", () => {
  const entry = (version, channels) => versionEntry(version, "2026-01-01T00:00:00Z", assets(version), channels);
  let versions = [];
  for (const version of ["1.0.0", "1.0.0-alpha.10", "1.0.0-alpha.2"]) versions = withVersion(versions, entry(version));
  versions = withVersion(versions, entry("1.0.0-alpha.2", ["downloads"]));
  assert.deepEqual(versions.map((e) => e.version), ["1.0.0-alpha.2", "1.0.0-alpha.10", "1.0.0"]);
  assert.deepEqual(through(versions, "scoop").map((e) => e.version), ["1.0.0-alpha.10", "1.0.0"]);
  assert.deepEqual(through(versions, "downloads").length, 3);
});

test("the site gets a version's files by kind, with their links and titles, and its sources", () => {
  const shown = siteVersion(versionEntry("1.0.0", "2026-01-01T00:00:00Z", assets("1.0.0")));
  assert.equal(shown.release, "https://github.com/uvlad7/BiLang-Play/releases/tag/v1.0.0");
  assert.deepEqual(Object.keys(shown.files), Object.keys(FILES));
  assert.equal(
    shown.files.deb.url,
    "https://github.com/uvlad7/BiLang-Play/releases/download/v1.0.0/bilangplay-1.0.0-linux-amd64.deb",
  );
  assert.equal(shown.files.deb.title.en, FILES.deb.title.en);
  assert.deepEqual(shown.sources.map((s) => s.name), ["ffmpeg-9.0.2.tar.xz", "build-ffmpeg.mjs"]);
});

test("the committed list: each published version once, the package managers from 0.1.0-alpha.2", () => {
  const path = fileURLToPath(new URL("../versions.json", import.meta.url));
  const versions = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(
    versions.map((entry) => entry.version),
    versions.reduce((list, entry) => withVersion(list, entry), []).map((entry) => entry.version),
  );
  // Every entry renders for the site: all its files are there.
  for (const entry of versions) siteVersion(entry);
  assert.deepEqual(through(versions, "downloads").map((e) => e.version).slice(0, 3), ["0.1.0-alpha.1", "0.1.0-alpha.2", "0.1.0-alpha.3"]);
  for (const channel of RELEASE_CHANNELS.slice(1)) {
    assert.equal(through(versions, channel)[0].version, "0.1.0-alpha.2", channel);
  }
  // The newest is the one the update file records.
  const record = JSON.parse(readFileSync(fileURLToPath(new URL("../release.json", import.meta.url)), "utf8"));
  assert.equal(`v${versions.at(-1).version}`, record.tag_name);
});
