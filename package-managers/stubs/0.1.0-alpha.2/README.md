# 0.1.0-alpha.2 package-manager release stubs

These sources have the final asset names and URLs, but every SHA-256 is
`0000000000000000000000000000000000000000000000000000000000000000`. They
are intentionally non-installable review fixtures. They are not package-manager
source. Once the immutable release assets exist, rerun
`node package-managers/render.mjs 0.1.0-alpha.2 path/to/release-assets`. Its output
is the complete source for each personal distribution channel.

Expected artifacts:

- `bilangplay-0.1.0-alpha.2-macos-arm64.zip`
- `bilangplay-0.1.0-alpha.2-linux-x64.tar.gz`
- `bilangplay-0.1.0-alpha.2-windows-x64.zip`
- `bilangplay-0.1.0-alpha.2-windows-x64-setup.exe`
