$ErrorActionPreference = 'Stop'
$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$installer = Join-Path $toolsDir 'bilangplay-0.1.0-alpha.2-windows-x64-setup.exe'

# Download and verify before removing the zone marker or executing anything.
Get-ChocolateyWebFile -PackageName $env:ChocolateyPackageName -FileFullPath $installer -Url 'https://github.com/uvlad7/BiLang-Play/releases/download/v0.1.0-alpha.2/bilangplay-0.1.0-alpha.2-windows-x64-setup.exe' -Checksum '8ae3b5bebc685b227193ae1fd443a03f7d5f820dfd5404ba7187163a43087d5b' -ChecksumType 'sha256'
Write-Warning 'SECURITY NOTICE: this package removes Mark-of-the-Web from a verified unsigned installer and its installed app files. Install only if you trust this package and SHA-256.'
Unblock-File -LiteralPath $installer
Install-ChocolateyInstallPackage -PackageName $env:ChocolateyPackageName -FileType 'exe' -File $installer -SilentArgs '/S' -ValidExitCodes @(0)
$installedApp = Get-UninstallRegistryKey -SoftwareName 'BiLang Play*' | Select-Object -First 1
if ($installedApp -and $installedApp.InstallLocation -and (Test-Path -LiteralPath $installedApp.InstallLocation)) { Get-ChildItem -LiteralPath $installedApp.InstallLocation -Recurse -File | Unblock-File }
