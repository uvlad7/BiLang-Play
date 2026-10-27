# Package-manager sources

This public repository is the release-facing source for package-manager
definitions. It includes review-only stubs for the next planned release, but
does not contain a checksum-less or mutable installable manifest.

The prepared `0.1.0-alpha.2` stubs are in
[`stubs/0.1.0-alpha.2/`](stubs/0.1.0-alpha.2/). Their all-zero SHA-256 values
make every installation fail deliberately. They document the final filenames
and URLs only; replace them by rendering from the immutable release artifacts.
The renderer produces the complete, independently deployable source for every
personal channel. Download the four release artifacts into one directory and
render the exact source with:

```sh
node package-managers/render.mjs <version> path/to/release-assets
```

To prepare another review-only stub before the release build exists:

```sh
node package-managers/render.mjs --stub <version>
```

The command creates `package-managers/out/<version>/` with the paths to commit
at this repository's root:

- `Casks/` — the personal Homebrew tap, with one macOS/Linux cask;
- `bucket/` — the personal Scoop bucket;
- `chocolatey/` — the Chocolatey package source; and
- `winget/` — a singleton manifest for the personal, Pages-backed WinGet
  source (not an upstream submission).

Each definition refers to immutable GitHub Release URLs and SHA-256 hashes.
Do not publish an output whose artifact hashes have not been verified.

The Linux cask owns the XDG desktop file and icon and writes
`packaged-by=brew`; Scoop similarly writes `packaged-by=scoop`. NSIS writes
`packaged-by=nsis` for both Chocolatey and WinGet.

The Cask and Scoop manifest are committed source because their version and
SHA-256 must be reviewable. WinGet's `source.msix`/`source2.msix`, and the
Chocolatey NuGet-v3 index and `.nupkg`, are derived CI/Pages deployment
artifacts and must not be committed. This one repository is the Homebrew tap,
Scoop bucket, personal WinGet source, and Chocolatey feed source; there is no
upstream WinGet submission or extra packaging repository.
