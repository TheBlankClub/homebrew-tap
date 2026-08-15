import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderCask, selectLatestCompleteAlphaRelease, sha256 } from "./update-t3code-alpha-cask.mjs";

function release(version, publishedAt, arches = ["arm64", "x64"]) {
  return {
    tag_name: `v${version}`,
    prerelease: true,
    draft: false,
    published_at: publishedAt,
    assets: arches.map((arch) => ({
      name: `T3-Code-Alpha-${version}-${arch}.dmg`,
      browser_download_url: `https://github.com/TheBlankClub/t3code-alpha/releases/download/v${version}/T3-Code-Alpha-${version}-${arch}.dmg`,
    })),
  };
}

describe("T3 Code Alpha cask updater", () => {
  it("selects the newest prerelease only after both macOS artifacts exist", () => {
    const complete = release("0.0.34-alpha.20260815.8", "2026-08-15T08:00:00Z");
    const incomplete = release("0.0.34-alpha.20260815.9", "2026-08-15T09:00:00Z", ["arm64"]);
    const selected = selectLatestCompleteAlphaRelease([complete, incomplete]);

    assert.equal(selected.version, "0.0.34-alpha.20260815.8");
    assert.equal(selected.release.tag_name, "v0.0.34-alpha.20260815.8");
  });

  it("renders architecture-specific checksums and the unsigned upgrade guidance", () => {
    const cask = renderCask({
      version: "0.0.34-alpha.20260815.8",
      arm64Sha256: "a".repeat(64),
      x64Sha256: "b".repeat(64),
    });

    assert.match(cask, /arch arm: "arm64", intel: "x64"/);
    assert.match(cask, new RegExp(`sha256 arm:   "${"a".repeat(64)}"`));
    assert.match(cask, new RegExp(`intel: "${"b".repeat(64)}"`));
    assert.match(cask, /T3-Code-Alpha-#\{version\}-#\{arch\}\.dmg/);
    assert.match(cask, /brew upgrade --cask --no-quarantine t3code-alpha/);
  });

  it("hashes downloaded release bytes", () => {
    assert.equal(sha256(new TextEncoder().encode("alpha")), "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8");
  });
});
