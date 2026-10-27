#!/usr/bin/env node
// Render package-manager repository sources from immutable release artifacts.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const owner = "uvlad7";
const repository = "BiLang-Play";
const releaseBase = `https://github.com/${owner}/${repository}/releases/download`;
// Keep this aligned with the application's reverse-DNS identifier. A WinGet
// package identifier is permanent after its first community-repository merge.
const packageId = "io.github.uvlad7.bilangplay";
const PLACEHOLDER_SHA256 = "0".repeat(64);

function usage() {
  throw new Error("usage: render.mjs <version> <release-assets-dir> [output-dir]");
}

/** @param {string} path */
function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** @param {string} version @param {string} directory */
function artifacts(version, directory) {
  const required = {
    mac: `bilangplay-${version}-macos-arm64.zip`,
    linux: `bilangplay-${version}-linux-x64.tar.gz`,
    zip: `bilangplay-${version}-windows-x64.zip`,
    nsis: `bilangplay-${version}-windows-x64-setup.exe`,
  };
  return Object.fromEntries(
    Object.entries(required).map(([key, name]) => {
      const path = join(directory, name);
      if (!existsSync(path)) throw new Error(`missing release artifact: ${path}`);
      return [key, { name, sha256: digest(path) }];
    }),
  );
}

/**
 * Release preparation is useful before GitHub Actions has created artifacts.
 * These hashes are valid-looking only so the generated package syntax is easy
 * to review. They cannot verify any real artifact and must never be published.
 * @param {string} version
 */
function placeholderArtifacts(version) {
  return Object.fromEntries(
    Object.entries({
      mac: `bilangplay-${version}-macos-arm64.zip`,
      linux: `bilangplay-${version}-linux-x64.tar.gz`,
      zip: `bilangplay-${version}-windows-x64.zip`,
      nsis: `bilangplay-${version}-windows-x64-setup.exe`,
    }).map(([key, name]) => [key, { name, sha256: PLACEHOLDER_SHA256 }]),
  );
}

/** @param {string} version @param {Record<string, { name: string, sha256: string }>} files */
function sources(version, files) {
  const release = `${releaseBase}/v${version}`;
  return new Map([
    [
      "Casks/bilang-play.rb",
      `cask "bilang-play" do
  version "${version}"
  archive = on_system_conditional macos: "${files.mac.name}", linux: "${files.linux.name}"
  sha256 arm: "${files.mac.sha256}", x86_64_linux: "${files.linux.sha256}"

  url "${release}/#{archive}"
  name "BiLang Play"
  desc "Local-first video player for language learners"
  homepage "https://github.com/${owner}/${repository}"

  on_macos do
    depends_on arch: :arm64
    app "BiLang Play.app"
    postflight_steps do
      # Temporary unsigned-preview workaround; never suitable for Homebrew/core.
      run "/usr/bin/xattr",
          args: ["-dr", "com.apple.quarantine", "{{appdir}}/BiLang Play.app"],
          must_succeed: false
    end
  end

  on_linux do
    depends_on arch: :x86_64
    preflight_steps do
      write_file "packaged-by", "brew\\n", append_newline: false
      inreplace "resources/desktop/bilang-play.desktop",
                "Exec=bilangplay",
                "Exec={{HOMEBREW_PREFIX}}/bin/bilangplay"
      mkdir_p ".local/share/applications", base: :home
    end
    binary "bilangplay"
    artifact "resources/desktop/bilang-play.desktop",
             target: "#{Dir.home}/.local/share/applications/bilang-play.desktop"
    artifact "resources/icons/hicolor/16x16/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/16x16/apps/bilang-play.png"
    artifact "resources/icons/hicolor/24x24/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/24x24/apps/bilang-play.png"
    artifact "resources/icons/hicolor/32x32/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/32x32/apps/bilang-play.png"
    artifact "resources/icons/hicolor/48x48/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/48x48/apps/bilang-play.png"
    artifact "resources/icons/hicolor/64x64/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/64x64/apps/bilang-play.png"
    artifact "resources/icons/hicolor/128x128/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/128x128/apps/bilang-play.png"
    artifact "resources/icons/hicolor/256x256/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/256x256/apps/bilang-play.png"
    artifact "resources/icons/hicolor/512x512/apps/bilang-play.png",
             target: "#{Dir.home}/.local/share/icons/hicolor/512x512/apps/bilang-play.png"
    artifact "resources/icons/hicolor/scalable/apps/bilang-play.svg",
             target: "#{Dir.home}/.local/share/icons/hicolor/scalable/apps/bilang-play.svg"
    artifact "resources/icons/hicolor/symbolic/apps/bilang-play-symbolic.svg",
             target: "#{Dir.home}/.local/share/icons/hicolor/symbolic/apps/bilang-play-symbolic.svg"
  end

  caveats <<~EOS
    macOS: SECURITY NOTICE: this unsigned cask clears quarantine after install.
    It bypasses Gatekeeper's downloaded-app check. Install only if you trust
    this tap and the SHA-256 above.
  EOS
end
`,
    ],
    [
      "bucket/bilang-play.json",
      `${JSON.stringify(
        {
          version,
          description: "Local-first video player for language learners",
          homepage: `https://github.com/${owner}/${repository}`,
          license: "Proprietary",
          architecture: { "64bit": { url: `${release}/${files.zip.name}`, hash: files.zip.sha256 } },
          bin: "BiLang Play.exe",
          shortcuts: [["BiLang Play.exe", "BiLang Play"]],
          post_install: [
            'Set-Content -LiteralPath "$dir\\packaged-by" -Value "scoop" -NoNewline',
            "Get-ChildItem -LiteralPath $dir -Recurse -File | Unblock-File",
            'Write-Warning "SECURITY NOTICE: Scoop removed Mark-of-the-Web from this unsigned app. Install only if you trust this bucket and its SHA-256."',
          ],
        },
        null,
        2,
      )}\n`,
    ],
    [
      "chocolatey/bilangplay.nuspec",
      `<?xml version="1.0"?>
<package><metadata><id>bilangplay</id><version>${version}</version><title>BiLang Play</title><authors>Uladzimir Ulyanitski</authors><projectUrl>https://github.com/${owner}/${repository}</projectUrl><license type="expression">Proprietary</license><requireLicenseAcceptance>false</requireLicenseAcceptance><summary>Local-first video player for language learners</summary><description>Installs BiLang Play's NSIS installer.</description><tags>video subtitles language-learning electron</tags></metadata><files><file src="tools\\**" target="tools" /></files></package>
`,
    ],
    [
      "chocolatey/tools/chocolateyinstall.ps1",
      `$ErrorActionPreference = 'Stop'
$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$installer = Join-Path $toolsDir '${files.nsis.name}'

# Download and verify before removing the zone marker or executing anything.
Get-ChocolateyWebFile -PackageName $env:ChocolateyPackageName -FileFullPath $installer -Url '${release}/${files.nsis.name}' -Checksum '${files.nsis.sha256}' -ChecksumType 'sha256'
Write-Warning 'SECURITY NOTICE: this package removes Mark-of-the-Web from a verified unsigned installer and its installed app files. Install only if you trust this package and SHA-256.'
Unblock-File -LiteralPath $installer
Install-ChocolateyInstallPackage -PackageName $env:ChocolateyPackageName -FileType 'exe' -File $installer -SilentArgs '/S' -ValidExitCodes @(0)
$installedApp = Get-UninstallRegistryKey -SoftwareName 'BiLang Play*' | Select-Object -First 1
if ($installedApp -and $installedApp.InstallLocation -and (Test-Path -LiteralPath $installedApp.InstallLocation)) { Get-ChildItem -LiteralPath $installedApp.InstallLocation -Recurse -File | Unblock-File }
`,
    ],
    [
      `winget/manifests/${packageId}.${version}.yaml`,
      `PackageIdentifier: ${packageId}\nPackageVersion: ${version}\nPackageLocale: en-US\nPublisher: Uladzimir Ulyanitski\nPublisherUrl: https://github.com/${owner}\nPublisherSupportUrl: https://github.com/${owner}/${repository}/issues\nPackageName: BiLang Play\nPackageUrl: https://github.com/${owner}/${repository}\nLicense: Proprietary\nShortDescription: Local-first video player for language learners\nInstallerType: nullsoft\nInstallers:\n  - Architecture: x64\n    InstallerUrl: ${release}/${files.nsis.name}\n    InstallerSha256: ${files.nsis.sha256}\nManifestType: singleton\nManifestVersion: 1.10.0\n`,
    ],
  ]);
}

const [, , first, second, third] = process.argv;
const placeholder = first === "--stub";
const version = placeholder ? second : first;
const directory = placeholder ? undefined : second;
const suppliedOutput = third;
if (!version || (!placeholder && !directory)) usage();
const output = resolve(
  suppliedOutput ?? join("package-managers", placeholder ? "stubs" : "out", version),
);
rmSync(output, { recursive: true, force: true });
const files = placeholder ? placeholderArtifacts(version) : artifacts(version, resolve(directory));
for (const [relative, text] of sources(version, files)) {
  const path = join(output, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
if (placeholder) {
  writeFileSync(
    join(output, "README.md"),
    `# ${version} package-manager release stubs\n\n` +
      "These sources have the final asset names and URLs, but every SHA-256 is\n" +
      "`0000000000000000000000000000000000000000000000000000000000000000`. They\n" +
      "are intentionally non-installable review fixtures. They are not package-manager\n" +
      "source. Once the immutable release assets exist, rerun\n" +
      "`node package-managers/render.mjs " + version + " path/to/release-assets`. Its output\n" +
      "is the complete source for each personal distribution channel.\n\n" +
      "Expected artifacts:\n\n" +
      `- \`${files.mac.name}\`\n` +
      `- \`${files.linux.name}\`\n` +
      `- \`${files.zip.name}\`\n` +
      `- \`${files.nsis.name}\`\n`,
  );
}
console.log(`Wrote ${placeholder ? "placeholder " : ""}package-manager sources to ${output}`);
