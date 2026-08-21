# typed: strict
# frozen_string_literal: true

cask "t3code-alpha" do
  arch arm: "arm64", intel: "x64"

  version "0.0.34-alpha.20260821.42"
  sha256 arm:   "0c2bba8390e2658e0e524afc0691ebc777f8174086f8af7854304fe261224773",
         intel: "ead6329490e44860d3aaf78f9b0b17123c121221e6055662ecbd56e6478408e6"

  url "https://github.com/TheBlankClub/t3code-alpha/releases/download/v#{version}/T3-Code-Alpha-#{version}-#{arch}.dmg"
  name "T3 Code Alpha"
  desc "TheBlankClub's frequently updated T3 Code distribution"
  homepage "https://github.com/TheBlankClub/t3code-alpha"

  depends_on :macos

  app "T3 Code Alpha.app"

  postflight do
    target = "#{appdir}/T3 Code Alpha.app"

    Dir.glob("#{target}/Contents/Frameworks/*.{app,framework}").each do |nested|
      system_command "/usr/bin/codesign",
                     args: ["--force", "--sign", "-", nested],
                     sudo: false
    end

    system_command "/usr/bin/codesign",
                   args: ["--force", "--deep", "--sign", "-", target],
                   sudo: false
    system_command "/usr/bin/codesign",
                   args: ["--verify", "--deep", "--strict", target],
                   sudo: false
    system_command "/usr/bin/xattr",
                   args: ["-dr", "com.apple.quarantine", target],
                   sudo: false
  end

  caveats <<~EOS
    T3 Code Alpha is not signed with an Apple Developer ID. This cask applies
    an ad-hoc signature and removes quarantine after every install or upgrade.
    Install it only if you trust TheBlankClub's release artifacts:

      brew install --cask theblankclub/tap/t3code-alpha
      brew upgrade --cask t3code-alpha
  EOS
end
