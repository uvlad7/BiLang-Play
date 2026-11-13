import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { release } from "./release.mjs";
import { FILES } from "./updates.mjs";

/** A directory of release files, each with its own content. */
function assets(root, version) {
  const directory = join(root, `assets-${version}`);
  mkdirSync(directory, { recursive: true });
  for (const { name } of Object.values(FILES)) writeFileSync(join(directory, name(version)), `${name(version)}\n`);
  return directory;
}

test("a release renders its sources, feed entry, version entry, and record; an older one keeps the record", () => {
  const root = mkdtempSync(join(tmpdir(), "bilangplay-release-"));
  try {
    const repository = join(root, "repository");
    mkdirSync(repository);
    release(repository, "1.0.0-alpha.3", assets(root, "1.0.0-alpha.3"), "2026-01-03T00:00:00Z");
    release(repository, "1.0.0-alpha.2", assets(root, "1.0.0-alpha.2"), "2026-01-02T00:00:00Z");
    const record = JSON.parse(readFileSync(join(repository, "release.json"), "utf8"));
    assert.equal(record.tag_name, "v1.0.0-alpha.3");
    assert.ok(record.assets.some((asset) => asset.name === "bilangplay-1.0.0-alpha.3-linux-amd64.deb"));
    assert.match(readFileSync(join(repository, "Casks", "bilang-play.rb"), "utf8"), /version "1\.0\.0-alpha\.2"/);
    // Both are published versions, through every channel, with the files the site offers.
    const versions = JSON.parse(readFileSync(join(repository, "versions.json"), "utf8"));
    assert.deepEqual(versions.map((e) => e.version), ["1.0.0-alpha.2", "1.0.0-alpha.3"]);
    assert.deepEqual(versions[0], {
      version: "1.0.0-alpha.2",
      published: "2026-01-02T00:00:00Z",
      channels: ["downloads", "brew-macos", "brew-linux", "scoop", "chocolatey"],
      assets: Object.values(FILES)
        .map(({ name }) => name("1.0.0-alpha.2"))
        .sort()
        .map((name) => ({ name, size: name.length + 1 })),
    });
    // The feed serves both.
    assert.deepEqual(
      JSON.parse(readFileSync(join(repository, "chocolatey", "v3", "flatcontainer", "bilangplay", "index.json"), "utf8")).versions,
      ["1.0.0-alpha.2", "1.0.0-alpha.3"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
