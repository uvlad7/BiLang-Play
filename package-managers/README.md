# Package-manager sources

This public repository is the release-facing source for package-manager
definitions. It contains only definitions generated from immutable release
artifacts with verified SHA-256 hashes.
The renderer produces the complete, independently deployable source for every
personal channel (`release.mjs` below runs it for a release). Download the four release artifacts into one directory and
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
`packaged-by=brew`; Scoop similarly writes `packaged-by=scoop`. Chocolatey
runs the NSIS installer, which writes `packaged-by=nsis`, then overwrites it
with `chocolatey`, so the app's update notice shows Chocolatey's command.

This one repository is the Homebrew tap, Scoop bucket, and Chocolatey feed.
The Cask, the Scoop manifest, and the Chocolatey `.nuspec` and install
script are committed source: their version, installer URL, and SHA-256 must
be reviewable. The Chocolatey feed, a static NuGet v3 feed in
`chocolatey/v3/` served by Pages, is built from that source by
`build-chocolatey-feed.mjs` for each release, and is committed with it:
every push to `main` redeploys Pages from the committed tree without
building the feed, so a feed left out of git would vanish with the next
deploy. The feed keeps every version, so an older one installs with
`choco install bilangplay --version <version>`: `chocolatey/versions.json`
lists them with their publish dates, each release adds its entry and its
`.nupkg` (the earlier packages stay as built), and the feed's service,
version, registration, and search files are rewritten from that list.

## A release

The private repository's package workflow runs `release.mjs` on a checkout
of this repository, from the release's own files, and offers the result as
the branch `release/v<version>` with a pull request and a draft release
targeting the branch's commit:

```sh
node package-managers/release.mjs <version> path/to/release-assets [published-at]
```

It renders the sources above, adds the version to the Chocolatey feed, and
records the release in `release.json`. Publish the draft and merge the pull
request together, with a merge commit: publishing creates the tag
`v<version>` on the branch's commit, so a package manager that checks the
tag out (Homebrew's tap and Scoop's bucket do, to install an older version;
the site shows how) gets that version's sources, and merging keeps the tag
in `main`'s history. Never move or delete a release's tag. The one
exception was made once, on 2026-11-12, for the two releases from before
this flow, whose tags held no sources of their own: `v0.1.0-alpha.2` was
moved from `230d4c2` to `767da64`, and `v0.1.0-alpha.3` from `948e17e` to
`672f356`, the commits on `main` with each version's own cask and manifest
(identical to what `render.mjs` produces from the release's files).
`v0.1.0-alpha.1` has no sources. This repository's
only workflow deploys Pages on a push to `main`.

## The update file

`license.mjs` keeps each license's description by id, and the id the next
release comes under. The release record keeps the id the release came
under, and the update file names it with its description: the app compares
it with its own (when a newer version's differs, its update notice warns
before the update steps), and the site's License section shows the
description. The terms change only with a new major version: add the new
id with the app's, and `updates.mjs` refuses to record a release under
another id than the recorded one without a new major version.

`instructions.mjs` holds the install, update, and uninstall steps, with
their texts in a small markup (`**bold**`, `` `code` ``, links): the one
source of the site's Install and Uninstall tabs and of the app's update
notice, which reads each install channel's download and update steps.
`updates.mjs` renders them, with the newest release's version and files,
into the update file, served as
`https://uvlad7.github.io/BiLang-Play/updates/main.json`. Every site build
renders it from the committed release record, `release.json`, so a changed
step reaches the site and released copies of the app with the next push.

A release's pull request carries `release.json` in the commit with the
sources above, so the update file never names a version a package manager
cannot install yet once the pull request is merged. A release older than
the recorded one leaves it as it is.

`release.mjs` writes it from the release's files. To write it from a
published release instead:

```sh
gh api repos/uvlad7/BiLang-Play/releases/tags/v<version> > github-release.json
node package-managers/updates.mjs github-release.json release.json
```
