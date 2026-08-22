# typed: strict
# frozen_string_literal: true

cask "t3code-alpha" do
  arch arm: "arm64", intel: "x64"

  version "0.0.34-alpha.20260822.47"
  sha256 arm:   "1b741b3a6c42115735fe0559c934a3606aa237f43ef8ae647aeec3e17ca71496",
         intel: "641a6bd4f2a451db13c3f8fc56dd96d06bf7ce32043af962ab15caab3175e645"

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
