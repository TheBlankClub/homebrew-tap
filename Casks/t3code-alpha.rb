# typed: strict
# frozen_string_literal: true

cask "t3code-alpha" do
  version "0.0.41-alpha.20260911.103"
  sha256 "ec43815ff4380d09b70ca67f61a8b6256fbc7157b1516689d992efba56003e7d"

  url "https://github.com/TheBlankClub/t3code-alpha/releases/download/v#{version}/T3-Code-Alpha-#{version}-arm64.dmg"
  name "T3 Code Alpha"
  desc "TheBlankClub's frequently updated T3 Code distribution"
  homepage "https://github.com/TheBlankClub/t3code-alpha"

  depends_on arch: :arm64
  depends_on :macos

  app "T3 Code Alpha.app"

  postflight_steps do
    # codesign requires nested bundles to be signed before the outer bundle, and
    # run steps cannot glob, so the inner-first pass runs in one shell step.
    run "/bin/sh",
        args:           ["-c", <<~SH, "sh", "{{appdir}}/T3 Code Alpha.app"],
          set -e
          for nested in "$1"/Contents/Frameworks/*.app "$1"/Contents/Frameworks/*.framework; do
            [ -e "$nested" ] || continue
            /usr/bin/codesign --force --sign - "$nested"
          done
        SH
        writable_paths: ["T3 Code Alpha.app"],
        writable_base:  :appdir
    run "/usr/bin/codesign",
        args:           ["--force", "--deep", "--sign", "-", "{{appdir}}/T3 Code Alpha.app"],
        writable_paths: ["T3 Code Alpha.app"],
        writable_base:  :appdir
    run "/usr/bin/codesign",
        args: ["--verify", "--deep", "--strict", "{{appdir}}/T3 Code Alpha.app"]
    run "/usr/bin/xattr",
        args:           ["-dr", "com.apple.quarantine", "{{appdir}}/T3 Code Alpha.app"],
        writable_paths: ["T3 Code Alpha.app"],
        writable_base:  :appdir
  end

  caveats <<~EOS
    T3 Code Alpha is not signed with an Apple Developer ID. This cask applies
    an ad-hoc signature and removes quarantine after every install or upgrade.
    Install it only if you trust TheBlankClub's release artifacts:

      brew install --cask theblankclub/tap/t3code-alpha
      brew upgrade --cask t3code-alpha
  EOS
end
