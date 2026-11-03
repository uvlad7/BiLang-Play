# Package-manager sources

This public repository is the release-facing source for package-manager
definitions. It contains only definitions generated from immutable release
artifacts with verified SHA-256 hashes.
The renderer produces the complete, independently deployable source for every
personal channel. Download the four release artifacts into one directory and
render the exact source with:

```sh
node package-managers/render.mjs <version> path/to/release-assets
```

The command creates `package-managers/out/<version>/` with the paths to commit
at this repository's root:

- `Casks/` — the personal Homebrew tap, with one macOS/Linux cask;
- `bucket/` — the personal Scoop bucket;
- `chocolatey/` — the Chocolatey package source (`bilangplay.nuspec` and
  `tools/chocolateyinstall.ps1`).

Each definition refers to immutable GitHub Release URLs and SHA-256 hashes.
Do not publish an output whose artifact hashes have not been verified.

The Linux cask owns the XDG desktop file and icon and writes
`packaged-by=brew`; Scoop similarly writes `packaged-by=scoop`. NSIS writes
`packaged-by=nsis` for Chocolatey.

This one repository is the Homebrew tap, Scoop bucket, and Chocolatey feed.
The Cask, the Scoop manifest, and the Chocolatey `.nuspec` and install
script are committed source: their version, installer URL, and SHA-256 must
be reviewable. The Chocolatey feed, a static NuGet v3 feed in
`chocolatey/v3/` served by Pages, is built from that source by
`build-chocolatey-feed.mjs` when a release is published, and is committed
with it: every push to `main` redeploys Pages from the committed tree
without building the feed, so a feed left out of git would vanish with the
next deploy. Its history also keeps the exact `.nupkg` each version served.
The feed holds only the newest version; each release replaces it.
