import assert from "node:assert/strict";
import test from "node:test";
import { sources } from "./render.mjs";

const artifacts = Object.fromEntries(
  ["mac", "linux", "zip", "nsis"].map((name) => [name, { name, sha256: "a".repeat(64) }]),
);

test("renders immutable, checksummed package-manager sources and local integration markers", () => {
  const files = sources("1.2.3", artifacts);
  const contents = [...files.values()].join("\n");
  const cask = files.get("Casks/bilang-play.rb");
  const chocolatey = files.get("chocolatey/tools/chocolateyinstall.ps1");

  assert.match(contents, /releases\/download\/v1\.2\.3/);
  assert.match(contents, new RegExp("a".repeat(64)));
  assert.match(cask, /write_file "#\{linux_root\}\/packaged-by", "brew/);
  assert.match(cask, /preflight_steps do/);
  assert.match(cask, /on_macos do[\s\S]*caveats <<~EOS[\s\S]*on_linux do/);
  assert.match(cask, /linux_root = "bilangplay-#\{version\}-linux-x64"/);
  assert.match(cask, /if_path_exists "#\{linux_root\}\/resources\/desktop\/bilang-play\.desktop" do/);
  assert.match(cask, /binary "#\{linux_root\}\/bilangplay"/);
  assert.match(cask, /artifact "#\{linux_root\}\/resources\/desktop\/bilang-play\.desktop"/);
  assert.match(cask, /hicolor_icons = %w\[/);
  assert.match(cask, /symbolic\/apps\/bilang-play-symbolic\.svg/);
  assert.match(cask, /hicolor_icons\.each do \|icon\|/);
  assert.match(files.get("bucket/bilang-play.json"), /packaged-by/);
  assert.match(files.get("bucket/bilang-play.json"), /Unblock-File/);
  assert.match(chocolatey, /Get-ChocolateyWebFile/);
  assert.match(chocolatey, /Install-ChocolateyInstallPackage/);
  assert.match(files.get("chocolatey/bilangplay.nuspec"), /<licenseUrl>https:\/\/raw\.githubusercontent\.com\/uvlad7\/BiLang-Play\/main\/LICENSE\.txt<\/licenseUrl>/);
  assert.ok(
    chocolatey.indexOf("Get-ChocolateyWebFile") < chocolatey.indexOf("Unblock-File -LiteralPath $installer"),
  );
  assert.ok(
    chocolatey.indexOf("Unblock-File -LiteralPath $installer") <
      chocolatey.indexOf("Install-ChocolateyInstallPackage"),
  );
});
