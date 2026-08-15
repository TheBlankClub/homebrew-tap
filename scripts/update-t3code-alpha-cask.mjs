#!/usr/bin/env node

import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_REPOSITORY = "TheBlankClub/t3code-alpha";
const RELEASES_URL = `https://api.github.com/repos/${SOURCE_REPOSITORY}/releases?per_page=30`;
const VERSION_PATTERN = /^v(\d+\.\d+\.\d+-alpha\.\d{8}\.\d+)$/;

function assetName(version, arch) {
  return `T3-Code-Alpha-${version}-${arch}.dmg`;
}

export function selectLatestCompleteAlphaRelease(releases) {
  return releases
    .filter((release) => release.prerelease === true && release.draft === false)
    .flatMap((release) => {
      const match = VERSION_PATTERN.exec(release.tag_name);
      if (!match) return [];

      const version = match[1];
      const arm64 = release.assets.find((asset) => asset.name === assetName(version, "arm64"));
      const x64 = release.assets.find((asset) => asset.name === assetName(version, "x64"));
      if (!arm64 || !x64) return [];

      return [{ release, version, arm64, x64 }];
    })
    .sort(
      (left, right) =>
        Date.parse(right.release.published_at) - Date.parse(left.release.published_at),
    )[0];
}

export function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export function renderCask({ version, arm64Sha256, x64Sha256 }) {
  return `# typed: strict
# frozen_string_literal: true

cask "t3code-alpha" do
  arch arm: "arm64", intel: "x64"

  version "${version}"
  sha256 arm:   "${arm64Sha256}",
         intel: "${x64Sha256}"

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
`;
}

export function githubApiHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "TheBlankClub-homebrew-tap",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson(fetchImpl, url, token) {
  const response = await fetchImpl(url, {
    headers: githubApiHeaders(token),
  });
  if (!response.ok) throw new Error(`GitHub releases request failed with ${response.status}.`);
  return response.json();
}

async function fetchAsset(fetchImpl, url) {
  if (!url.startsWith(`https://github.com/${SOURCE_REPOSITORY}/releases/download/`)) {
    throw new Error(`Refusing unexpected release asset URL: ${url}`);
  }
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "TheBlankClub-homebrew-tap" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Release asset request failed with ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
}

async function readExisting(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function writeOutput(entries) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await appendFile(outputPath, entries.map(([key, value]) => `${key}=${value}\n`).join(""));
}

export async function updateCask({
  fetchImpl = fetch,
  outputPath = resolve("Casks/t3code-alpha.rb"),
  githubToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
} = {}) {
  const releases = await fetchJson(fetchImpl, RELEASES_URL, githubToken);
  const selected = selectLatestCompleteAlphaRelease(releases);
  if (!selected) throw new Error("No complete T3 Code Alpha prerelease with both DMGs was found.");

  const [arm64Contents, x64Contents] = await Promise.all([
    fetchAsset(fetchImpl, selected.arm64.browser_download_url),
    fetchAsset(fetchImpl, selected.x64.browser_download_url),
  ]);
  const cask = renderCask({
    version: selected.version,
    arm64Sha256: sha256(arm64Contents),
    x64Sha256: sha256(x64Contents),
  });
  const changed = (await readExisting(outputPath)) !== cask;

  if (changed) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, cask);
  }
  await writeOutput([
    ["changed", String(changed)],
    ["version", selected.version],
    ["tag", selected.release.tag_name],
  ]);
  console.log(`${changed ? "Updated" : "Already current at"} T3 Code Alpha ${selected.version}.`);
  return { changed, version: selected.version, tag: selected.release.tag_name };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await updateCask();
}
