import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  githubApiHeaders,
  renderCask,
  selectLatestCompleteAlphaRelease,
  sha256,
  updateCask,
} from "./update-t3code-alpha-cask.mjs";

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
  it("authenticates GitHub API requests when the workflow provides a token", () => {
    assert.equal(githubApiHeaders("test-token").Authorization, "Bearer test-token");
    assert.ok(!("Authorization" in githubApiHeaders()));
  });

  it("selects the newest prerelease with an arm64 DMG over an older dual-DMG release", () => {
    const olderDualDmg = release("0.0.34-alpha.20260815.8", "2026-08-15T08:00:00Z");
    const newestArm64Only = release("0.0.34-alpha.20260815.9", "2026-08-15T09:00:00Z", ["arm64"]);
    const selected = selectLatestCompleteAlphaRelease([olderDualDmg, newestArm64Only]);

    assert.equal(selected.version, "0.0.34-alpha.20260815.9");
    assert.equal(selected.release.tag_name, "v0.0.34-alpha.20260815.9");
  });

  it("rejects prereleases without an arm64 DMG", () => {
    const x64Only = release("0.0.34-alpha.20260815.9", "2026-08-15T09:00:00Z", ["x64"]);

    assert.equal(selectLatestCompleteAlphaRelease([x64Only]), undefined);
  });

  it("updates the same version when its cask schema changes", async () => {
    const version = "0.0.34-alpha.20260815.9";
    const selectedRelease = release(version, "2026-08-15T09:00:00Z", ["arm64"]);
    const assetContents = new TextEncoder().encode("arm64-alpha");
    const directory = await mkdtemp(join(tmpdir(), "t3code-alpha-cask-"));
    const outputPath = join(directory, "t3code-alpha.rb");
    const fetchImpl = async (url) => {
      if (url.includes("/releases?")) return new Response(JSON.stringify([selectedRelease]));
      if (url === selectedRelease.assets[0].browser_download_url) return new Response(assetContents);
      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      await writeFile(outputPath, `cask "t3code-alpha" do\n  version "${version}"\nend\n`);

      const first = await updateCask({ fetchImpl, outputPath, githubToken: "test-token" });
      assert.equal(first.changed, true);
      assert.equal(first.version, version);
      assert.equal(
        await readFile(outputPath, "utf8"),
        renderCask({ version, arm64Sha256: sha256(assetContents) }),
      );

      const second = await updateCask({ fetchImpl, outputPath, githubToken: "test-token" });
      assert.equal(second.changed, false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("renders an arm64-only cask with automatic ad-hoc signing", () => {
    const cask = renderCask({
      version: "0.0.34-alpha.20260815.8",
      arm64Sha256: "a".repeat(64),
    });

    assert.match(cask, new RegExp(`sha256 "${"a".repeat(64)}"`));
    assert.match(cask, /T3-Code-Alpha-#\{version\}-arm64\.dmg/);
    assert.match(cask, /depends_on arch: :arm64/);
    assert.doesNotMatch(cask, /intel/);
    assert.match(cask, /postflight_steps do/);
    assert.doesNotMatch(cask, /^  postflight do$/m);
    assert.match(cask, /Contents\/Frameworks\/\*\.app/);
    assert.match(cask, /codesign --force --sign - "\$nested"/);
    assert.match(cask, /args:\s+\["--force", "--deep", "--sign", "-", "\{\{appdir\}\}\/T3 Code Alpha\.app"\]/);
    assert.match(cask, /args:\s+\["--verify", "--deep", "--strict", "\{\{appdir\}\}\/T3 Code Alpha\.app"\]/);
    assert.match(cask, /args:\s+\["-dr", "com\.apple\.quarantine", "\{\{appdir\}\}\/T3 Code Alpha\.app"\]/);
    assert.match(cask, /brew upgrade --cask t3code-alpha/);
    assert.doesNotMatch(cask, /--no-quarantine/);
    assert.doesNotMatch(cask, /verified:/);

    assert.ok(cask.indexOf('"--verify"') < cask.indexOf('"-dr"'));
  });

  it("hashes downloaded release bytes", () => {
    assert.equal(sha256(new TextEncoder().encode("alpha")), "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8");
  });
});
