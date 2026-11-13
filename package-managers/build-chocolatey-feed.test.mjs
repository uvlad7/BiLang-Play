import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildFeed } from "./build-chocolatey-feed.mjs";

test("builds a static NuGet v3 package, registration, and search feed", () => {
  const root = mkdtempSync(join(tmpdir(), "bilangplay-choco-"));
  try {
    const source = join(root, "source");
    mkdirSync(join(source, "tools"), { recursive: true });
    writeFileSync(join(source, "bilangplay.nuspec"), "<package />");
    writeFileSync(join(source, "tools", "chocolateyinstall.ps1"), "Write-Output test");
    buildFeed("1.2.3", source, join(root, "feed"), [{ version: "1.2.3", published: "2026-01-01T00:00:00Z" }]);
    const feed = join(root, "feed", "v3");
    const serviceIndex = readFileSync(join(feed, "index.json"), "utf8");
    assert.match(serviceIndex, /PackageBaseAddress/);
    assert.match(serviceIndex, /"@type": "SearchQueryService"/);
    assert.match(serviceIndex, /"@type": "SearchQueryService\/3\.0\.0-beta"/);
    assert.match(serviceIndex, /"@type": "RegistrationsBaseUrl"/);
    assert.match(serviceIndex, /"@type": "RegistrationsBaseUrl\/3\.0\.0-rc"/);
    assert.match(readFileSync(join(feed, "flatcontainer", "bilangplay", "index.json"), "utf8"), /1.2.3/);
    assert.ok(readFileSync(join(feed, "flatcontainer", "bilangplay", "1.2.3", "bilangplay.1.2.3.nupkg")).length > 0);
    const registration = readFileSync(join(feed, "registration", "bilangplay", "index.json"), "utf8");
    assert.match(registration, /packageContent/);
    assert.match(registration, /"lower": "1\.2\.3"/);
    assert.match(registration, /"upper": "1\.2\.3"/);
    assert.match(readFileSync(join(feed, "search", "query"), "utf8"), /"registration"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("keeps every version in the feed, newest first in search, so an older one can be installed", () => {
  const root = mkdtempSync(join(tmpdir(), "bilangplay-choco-"));
  try {
    const source = join(root, "source");
    mkdirSync(join(source, "tools"), { recursive: true });
    writeFileSync(join(source, "bilangplay.nuspec"), "<package />");
    writeFileSync(join(source, "tools", "chocolateyinstall.ps1"), "Write-Output test");
    const feed = join(root, "feed");
    // As versions.json lists them, by when each was released.
    const listed = [];
    for (const [version, published] of [
      ["1.0.0-alpha.10", "2026-01-01T00:00:00.000Z"],
      ["1.0.0-alpha.2", "2026-01-02T00:00:00.000Z"],
      ["1.0.0", "2026-01-03T00:00:00.000Z"],
    ]) {
      listed.push({ version, published });
      buildFeed(version, source, feed, listed);
    }
    const read = (...path) => JSON.parse(readFileSync(join(feed, "v3", ...path), "utf8"));
    const order = ["1.0.0-alpha.2", "1.0.0-alpha.10", "1.0.0"];
    assert.deepEqual(read("flatcontainer", "bilangplay", "index.json").versions, order);
    const page = read("registration", "bilangplay", "index.json").items[0];
    assert.equal(page.count, 3);
    assert.equal(page.lower, "1.0.0-alpha.2");
    assert.equal(page.upper, "1.0.0");
    assert.deepEqual(page.items.map((leaf) => leaf.catalogEntry.version), order);
    assert.equal(page.items[0].catalogEntry.published, "2026-01-02T00:00:00.000Z");
    for (const version of order) {
      assert.ok(readFileSync(join(feed, "v3", "flatcontainer", "bilangplay", version, `bilangplay.${version}.nupkg`)).length > 0);
      assert.equal(read("registration", "bilangplay", `${version}.json`).catalogEntry.version, version);
    }
    const hit = read("search", "query").data[0];
    assert.equal(hit.version, "1.0.0");
    assert.deepEqual(hit.versions.map((v) => v.version), order);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("refuses to build a version its list does not have", () => {
  assert.throws(() => buildFeed("1.0.0", "unused", "unused", [{ version: "0.9.0", published: "2026-01-01T00:00:00Z" }]), /do not list 1\.0\.0/);
});
