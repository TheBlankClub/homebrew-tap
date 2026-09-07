# TheBlankClub Homebrew Tap

Homebrew packages maintained by [TheBlankClub](https://github.com/TheBlankClub).

## T3 Code Alpha

The tap checks for a T3 Code Alpha prerelease with an arm64 macOS DMG every 30 minutes. It publishes
the arm64-only cask after that artifact's SHA-256 checksum has been calculated and audited.

T3 Code Alpha is not signed with an Apple Developer ID. During every install or upgrade, the cask
applies an ad-hoc signature to the Electron app, verifies the resulting bundle, and then removes its
quarantine attribute. Install it only if you trust the release artifacts published by
`TheBlankClub/t3code-alpha`:

```sh
brew install --cask theblankclub/tap/t3code-alpha
```

Upgrade to the newest Alpha release with:

```sh
brew update
brew upgrade --cask t3code-alpha
```

The app's settings and projects remain in `~/.t3-alpha` across cask upgrades.
