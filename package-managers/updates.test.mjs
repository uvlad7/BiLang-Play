import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./instructions.mjs";
import { FILES, SCHEMA, compareVersions, releaseRecord, renderUpdates } from "./updates.mjs";

const script = fileURLToPath(new URL("./updates.mjs", import.meta.url));

/** A release as the GitHub API returns it, with every package. */
function release(version, extra = []) {
  const names = [
    ...Object.values(FILES).map(({ name }) => name(version)),
    `bilangplay-${version}-windows-x64-setup.exe.blockmap`,
    "latest.yml",
    "ffmpeg-9.0.2.tar.xz",
    "opus-1.6.1.tar.gz",
    "build-ffmpeg.mjs",
    ...extra,
  ];
  return {
    tag_name: `v${version}`,
    published_at: "2026-12-01T10:00:00Z",
    html_url: `https://github.com/uvlad7/BiLang-Play/releases/tag/v${version}`,
    draft: false,
    assets: names.map((name, index) => ({
      name,
      size: 1000 + index,
      browser_download_url: `https://github.com/uvlad7/BiLang-Play/releases/download/v${version}/${name}`,
    })),
  };
}

test("orders versions by semantic-version precedence", () => {
  const ordered = [
    "0.0.1-dev",
    "0.1.0-alpha.2",
    "0.1.0-alpha.3",
    "0.1.0-alpha.10",
    "0.1.0-beta",
    "0.1.0-beta.1",
    "0.1.0",
    "0.1.1",
    "0.2.0",
    "1.0.0-rc.1",
    "1.0.0",
  ];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = 0; j < ordered.length; j++) {
      assert.equal(Math.sign(compareVersions(ordered[i], ordered[j])), Math.sign(i - j), `${ordered[i]} vs ${ordered[j]}`);
    }
  }
  assert.equal(compareVersions("1.0.0+build.1", "1.0.0"), 0);
  assert.throws(() => compareVersions("1.0", "1.0.0"), /not a version/);
});

test("names the version, its files, its sources, and every channel's commands", () => {
  const updates = renderUpdates(release("0.1.0-beta.1"));
  const base = "https://github.com/uvlad7/BiLang-Play/releases/download/v0.1.0-beta.1";
  assert.equal(updates.schema, SCHEMA);
  assert.equal(updates.version, "0.1.0-beta.1");
  assert.equal(updates.published, "2026-12-01T10:00:00Z");
  assert.equal(updates.notes, "https://uvlad7.github.io/BiLang-Play/#v0.1.0-beta.1");
  assert.deepEqual(Object.keys(updates.files), Object.keys(FILES));
  assert.deepEqual(updates.files.deb, {
    name: "bilangplay-0.1.0-beta.1-linux-amd64.deb",
    url: `${base}/bilangplay-0.1.0-beta.1-linux-amd64.deb`,
    size: 1005,
    title: { en: "Debian/Ubuntu package (.deb)", ru: "Пакет Debian/Ubuntu (.deb)" },
  });
  assert.deepEqual(
    updates.sources.map((s) => s.name),
    ["ffmpeg-9.0.2.tar.xz", "opus-1.6.1.tar.gz", "build-ffmpeg.mjs"],
  );
  assert.deepEqual(Object.keys(updates.channels), Object.keys(CHANNELS));
  assert.deepEqual(
    updates.channels["brew-linux"].update.map((a) => a.commands),
    [
      [
        'git -C "$(brew --repository uvlad7/bilang-play)" pull --ff-only',
        "brew upgrade --cask uvlad7/bilang-play/bilang-play",
      ],
      ["brew update", "brew upgrade --cask uvlad7/bilang-play/bilang-play"],
    ],
  );
  assert.deepEqual(updates.channels.deb.downloads, [
    { url: `${base}/bilangplay-0.1.0-beta.1-linux-amd64.deb`, title: updates.files.deb.title },
  ]);
  assert.deepEqual(updates.channels.deb.update[0].commands, [
    `wget -O /tmp/bilangplay.deb ${base}/bilangplay-0.1.0-beta.1-linux-amd64.deb`,
    "sudo apt install /tmp/bilangplay.deb",
  ]);
  assert.equal(updates.channels.chocolatey.update[0].elevated, true);
  assert.equal(updates.channels.scoop.update[0].elevated, undefined);
  assert.match(updates.channels.scoop.warning.en, /^Scoop warns/);
  assert.match(updates.channels.chocolatey.warning.en, /^Chocolatey warns/);
  assert.match(updates.channels["brew-macos"].warning.en, /^Homebrew warns/);
  assert.equal(updates.channels["brew-linux"].warning, undefined);
  // The site shows a channel's warning with its install steps.
  assert.deepEqual(updates.install.windows[1].warning, updates.channels.scoop.warning);
  assert.deepEqual(
    updates.channels.nsis.downloads.map((file) => file.url),
    [`${base}/bilangplay-0.1.0-beta.1-windows-x64-setup.exe`],
  );
  assert.deepEqual(
    updates.channels.macos.downloads.map((file) => [file.url, file.title.en]),
    [
      [`${base}/bilangplay-0.1.0-beta.1-macos-arm64.dmg`, "Disk image (.dmg)"],
      [`${base}/bilangplay-0.1.0-beta.1-macos-arm64.zip`, "App (.app in .zip)"],
    ],
  );
  const text = JSON.stringify(updates);
  assert.doesNotMatch(text, /\{(version|name:|url:)/);
});

// The app's interface languages: a text may add any of them to English and
// Russian (the site shows those two only).
const LANGUAGES = ["en", "be", "uk", "ru", "de", "fr", "es", "it"];
const languages = (value, where) => {
  const keys = Object.keys(value);
  assert.ok(keys.includes("en") && keys.includes("ru"), where);
  assert.ok(keys.every((key) => LANGUAGES.includes(key)), where);
};

test("every step is well formed: texts in English and Russian, commands as lines, known channels", () => {
  const updates = renderUpdates(release("1.0.0"));
  const text = (value, where) => {
    if (typeof value === "string") return;
    languages(value, where);
    for (const lines of Object.values(value)) assert.ok([lines].flat().every((l) => typeof l === "string" && l), where);
  };
  const steps = (list, where) => {
    assert.ok(Array.isArray(list) && list.length > 0, where);
    for (const step of list) {
      if (step.updates) {
        assert.ok(updates.channels[step.updates]?.update, `${where}: ${step.updates}`);
        continue;
      }
      assert.ok(step.title || step.text || step.commands, where);
      for (const key of ["title", "text", "warning"]) if (step[key]) text(step[key], where);
      if (step.commands) {
        const lists = Array.isArray(step.commands) ? [step.commands] : Object.values(step.commands);
        if (!Array.isArray(step.commands)) languages(step.commands, where);
        for (const lines of lists) {
          assert.ok(lines.length > 0 && lines.every((l) => typeof l === "string" && l && !l.includes("\n")), where);
        }
      }
      if (step.more) {
        text(step.more.summary, where);
        steps(step.more.steps, `${where} (more)`);
      }
    }
  };
  for (const [name, channel] of Object.entries(updates.channels)) {
    assert.ok(channel.downloads?.length || channel.update, name);
    if (channel.warning) text(channel.warning, name);
    if (channel.update) steps(channel.update, name);
    // The app shows an update step's text first.
    for (const step of channel.update ?? []) assert.ok(step.text && step.commands, name);
  }
  for (const part of ["install", "uninstall"]) {
    assert.deepEqual(Object.keys(updates[part]), ["windows", "macos", "linux"]);
    for (const [system, list] of Object.entries(updates[part])) steps(list, `${part}.${system}`);
  }
});

test("elevated commands come with sudo and gsudo, collapsed", () => {
  const step = renderUpdates(release("1.0.0")).channels.chocolatey.update[0];
  assert.equal(step.elevated, true);
  assert.deepEqual(
    step.more.steps.map((s) => s.commands),
    [
      ["sudo choco upgrade bilangplay --source bilangplay --pre -y"],
      ["gsudo choco upgrade bilangplay --source bilangplay --pre -y"],
    ],
  );
});

test("refuses a release missing a package, a draft, or a link elsewhere", () => {
  const missing = release("0.2.0");
  missing.assets = missing.assets.filter((a) => !a.name.endsWith(".deb"));
  assert.throws(() => renderUpdates(missing), /no bilangplay-0\.2\.0-linux-amd64\.deb/);
  assert.throws(() => renderUpdates({ ...release("0.2.0"), draft: true }), /draft/);
  const moved = release("0.2.0");
  moved.assets[0].browser_download_url = "https://example.com/x.exe";
  assert.throws(() => renderUpdates(moved), /unexpected download link/);
  assert.throws(() => renderUpdates(release("0.2")), /not a version/);
});

test("the command records a newer release and leaves an older one", () => {
  const directory = mkdtempSync(join(tmpdir(), "updates-"));
  const output = join(directory, "release.json");
  const run = (version) => {
    const input = join(directory, `${version}.json`);
    writeFileSync(input, JSON.stringify({ ...release(version), author: { login: "x" }, body: "notes" }));
    execFileSync(process.execPath, [script, input, output], { stdio: "pipe" });
    return JSON.parse(readFileSync(output, "utf8"));
  };
  assert.equal(run("0.1.0-alpha.3").tag_name, "v0.1.0-alpha.3");
  const record = run("0.1.0-beta.1");
  assert.equal(record.tag_name, "v0.1.0-beta.1");
  assert.deepEqual(Object.keys(record), ["tag_name", "published_at", "html_url", "assets"]);
  assert.deepEqual(renderUpdates(record), renderUpdates(release("0.1.0-beta.1")));
  assert.equal(run("0.1.0-alpha.4").tag_name, "v0.1.0-beta.1");
  // The same version again (a release deleted and published again).
  assert.equal(run("0.1.0-beta.1").tag_name, "v0.1.0-beta.1");
  assert.throws(() => releaseRecord({ ...release("0.2.0"), assets: [] }), /the release has no/);
});
