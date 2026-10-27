cask "bilang-play" do
  version "0.1.0-alpha.2"
  archive = on_system_conditional macos: "bilangplay-0.1.0-alpha.2-macos-arm64.zip", linux: "bilangplay-0.1.0-alpha.2-linux-x64.tar.gz"
  sha256 arm: "0000000000000000000000000000000000000000000000000000000000000000", x86_64_linux: "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/uvlad7/BiLang-Play/releases/download/v0.1.0-alpha.2/#{archive}"
  name "BiLang Play"
  desc "Local-first video player for language learners"
  homepage "https://github.com/uvlad7/BiLang-Play"

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
      write_file "packaged-by", "brew\n", append_newline: false
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
