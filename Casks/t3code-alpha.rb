# typed: strict
# frozen_string_literal: true

cask "t3code-alpha" do
  arch arm: "arm64", intel: "x64"

  version "0.0.34-alpha.20260815.2"
  sha256 arm:   "b8b7a703597547c8d4ac53a260b23b416cb832799372065d76641533f0765eb8",
         intel: "7586554cb3d3e169077138160e5e1bcf89181eb3d03b26e4ae1e3d8d9e3c0f6b"

  url "https://github.com/TheBlankClub/t3code-alpha/releases/download/v#{version}/T3-Code-Alpha-#{version}-#{arch}.dmg"
  name "T3 Code Alpha"
  desc "TheBlankClub's frequently updated T3 Code distribution"
  homepage "https://github.com/TheBlankClub/t3code-alpha"

  depends_on :macos

  app "T3 Code Alpha.app"

  caveats <<~EOS
    T3 Code Alpha is currently unsigned. Install and upgrade it without macOS
    quarantine only if you trust TheBlankClub's release artifacts:

      brew install --cask --no-quarantine theblankclub/tap/t3code-alpha
      brew upgrade --cask --no-quarantine t3code-alpha
  EOS
end
