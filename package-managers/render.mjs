#!/usr/bin/env node
// Render package-manager repository sources from immutable release artifacts.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const owner = "uvlad7";
const repository = "BiLang-Play";
const releaseBase = `https://github.com/${owner}/${repository}/releases/download`;

function usage() {
  throw new Error("usage: render.mjs <version> <release-assets-dir> [output-dir]");
}

/** @param {string} path */
function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** @param {string} version @param {string} directory */
export function artifacts(version, directory) {
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

/** @param {string} version @param {Record<string, { name: string, sha256: string }>} files */
export function sources(version, files) {
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

    caveats <<~EOS
      SECURITY NOTICE: this unsigned cask clears quarantine after install.
      It bypasses Gatekeeper's downloaded-app check. Install only if you trust
      this tap and the SHA-256 above.
    EOS
  end

  on_linux do
    depends_on arch: :x86_64
    linux_root = "bilangplay-#{version}-linux-x64"
    preflight_steps do
      write_file "#{linux_root}/packaged-by", "brew\\n", append_newline: false
      if_path_exists "#{linux_root}/resources/desktop/bilang-play.desktop" do
        inreplace "#{linux_root}/resources/desktop/bilang-play.desktop",
                  "Exec=bilangplay",
                  "Exec={{HOMEBREW_PREFIX}}/bin/bilangplay"
      end
      mkdir_p ".local/share/applications", base: :home
    end
    binary "#{linux_root}/bilangplay"
    artifact "#{linux_root}/resources/desktop/bilang-play.desktop",
             target: "#{Dir.home}/.local/share/applications/bilang-play.desktop"
    hicolor_icons = %w[
      16x16/apps/bilang-play.png
      24x24/apps/bilang-play.png
      32x32/apps/bilang-play.png
      48x48/apps/bilang-play.png
      64x64/apps/bilang-play.png
      128x128/apps/bilang-play.png
      256x256/apps/bilang-play.png
      512x512/apps/bilang-play.png
      scalable/apps/bilang-play.svg
      symbolic/apps/bilang-play-symbolic.svg
    ]
    hicolor_icons.each do |icon|
      artifact "#{linux_root}/resources/icons/hicolor/#{icon}",
               target: "#{Dir.home}/.local/share/icons/hicolor/#{icon}"
    end
  end

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
<package><metadata><id>bilangplay</id><version>${version}</version><title>BiLang Play</title><authors>Uladzimir Ulyanitski (uvlad7)</authors><projectUrl>https://github.com/${owner}/${repository}</projectUrl><licenseUrl>https://raw.githubusercontent.com/${owner}/${repository}/main/LICENSE.txt</licenseUrl><requireLicenseAcceptance>false</requireLicenseAcceptance><summary>Local-first video player for language learners</summary><description>Installs BiLang Play's NSIS installer.</description><tags>video subtitles language-learning electron</tags></metadata><files><file src="tools\\**" target="tools" /></files></package>
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
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , version, directory, suppliedOutput] = process.argv;
  if (!version || !directory) usage();
  const output = resolve(suppliedOutput ?? join("package-managers", "out", version));
  rmSync(output, { recursive: true, force: true });
  const files = artifacts(version, resolve(directory));
  for (const [relative, text] of sources(version, files)) {
    const path = join(output, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  console.log(`Wrote package-manager sources to ${output}`);
}
