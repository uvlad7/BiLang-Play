cask "bilang-play" do
  version "0.1.0-alpha.2"
  archive = on_system_conditional macos: "bilangplay-0.1.0-alpha.2-macos-arm64.zip", linux: "bilangplay-0.1.0-alpha.2-linux-x64.tar.gz"
  sha256 arm: "930091bf3212737ac54b39095f4e26cd59d61d53bcf55cc3321793ef2c3d6150", x86_64_linux: "3262acd1ca61adca6d3bc6605b5bb465597c08c028226b096daf7da4b635aea3"

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
    container nested: "bilangplay-#{version}-linux-x64"
    preflight_steps do
      write_file "packaged-by", "brew\n", append_newline: false
      if_path_exists "resources/desktop/bilang-play.desktop" do
        inreplace "resources/desktop/bilang-play.desktop",
                  "Exec=bilangplay",
                  "Exec={{HOMEBREW_PREFIX}}/bin/bilangplay"
      end
      mkdir_p ".local/share/applications", base: :home
    end
    binary "bilangplay"
    artifact "resources/desktop/bilang-play.desktop",
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
      artifact "resources/icons/hicolor/#{icon}",
               target: "#{Dir.home}/.local/share/icons/hicolor/#{icon}"
    end
  end

  caveats <<~EOS
    macOS: SECURITY NOTICE: this unsigned cask clears quarantine after install.
    It bypasses Gatekeeper's downloaded-app check. Install only if you trust
    this tap and the SHA-256 above.
  EOS
end
