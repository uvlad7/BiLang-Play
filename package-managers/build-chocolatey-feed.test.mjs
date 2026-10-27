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
    buildFeed("1.2.3", source, join(root, "feed"));
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
