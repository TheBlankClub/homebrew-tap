# TheBlankClub Homebrew Tap

Homebrew packages maintained by [TheBlankClub](https://github.com/TheBlankClub).

## T3 Code Alpha

The tap checks for a complete T3 Code Alpha prerelease every 30 minutes. It publishes the cask only
after both macOS DMGs are available and their SHA-256 checksums have been calculated and audited.

T3 Code Alpha is currently unsigned. Install it without macOS quarantine only if you trust the
release artifacts published by `TheBlankClub/t3code-alpha`:

```sh
brew install --cask --no-quarantine theblankclub/tap/t3code-alpha
```

Upgrade to the newest Alpha release with:

```sh
brew update
brew upgrade --cask --no-quarantine t3code-alpha
```

The app's settings and projects remain in `~/.t3-alpha` across cask upgrades.
