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
- `chocolatey/` — the Chocolatey package source.

Each definition refers to immutable GitHub Release URLs and SHA-256 hashes.
Do not publish an output whose artifact hashes have not been verified.

The Linux cask owns the XDG desktop file and icon and writes
`packaged-by=brew`; Scoop similarly writes `packaged-by=scoop`. NSIS writes
`packaged-by=nsis` for Chocolatey.

The Cask and Scoop manifest are committed source because their version and
SHA-256 must be reviewable. The Chocolatey NuGet-v3 index and `.nupkg` are
derived CI/Pages deployment artifacts and must not be committed. This one
repository is the Homebrew tap, Scoop bucket, and Chocolatey feed source.
