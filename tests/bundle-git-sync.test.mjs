import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("bundle git sync helper exists", () => {
  const path = join(repoRoot, "shared/extensions/bundle-git-sync.ts");
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, "utf8");
  assert.match(source, /syncBundleGitCheckout/);
  assert.match(source, /version:refname/);
  assert.match(source, /fetch", "--tags"/);
});

test("bundle git sync uses versioned release roots instead of checkout mutation", () => {
  const source = readFileSync(join(repoRoot, "shared/extensions/bundle-git-sync.ts"), "utf8");
  assert.match(source, /worktree", "add"/);
  assert.match(source, /npm ci/);
  assert.match(source, /npm run ci/);
  assert.match(source, /activeReleaseRoot/);
  assert.match(source, /bundleCommit/);
  assert.match(source, /flag: "wx"/);
  assert.doesNotMatch(source, /checkout", "--detach"/);
  assert.doesNotMatch(source, /npm install/);
  assert.doesNotMatch(source, /dirty-working-tree/);
  assert.doesNotMatch(source, /rollbackToKnownGood/);
});

test("agent bundle loader syncs before verified dynamic bundle import", () => {
  const path = join(repoRoot, "shared/extensions/agent-bundle-loader.ts");
  const source = readFileSync(path, "utf8");
  assert.match(source, /syncBundleGitCheckout\(/);
  assert.match(source, /resolveBundleImportUrl\(/);
  assert.match(source, /await import\(importUrl\)/);
  assert.doesNotMatch(source, /^import .* from "\.\.\/\.\.\/bundles\//m);
  const syncIndex = source.indexOf("syncBundleGitCheckout(");
  const loadIndex = source.indexOf("await import(importUrl)");
  assert.ok(syncIndex >= 0 && loadIndex >= 0, "expected sync and dynamic load markers");
  assert.ok(syncIndex < loadIndex, "sync must run before dynamic bundle import");
});

test("README documents immutable versioned auto-sync", () => {
  const source = readFileSync(join(repoRoot, "README.md"), "utf8");
  assert.match(source, /Auto-sync latest release tag/);
  assert.match(source, /PI_AGENT_BUNDLES_SYNC/);
  assert.match(source, /versioned release root/);
  assert.match(source, /cursor-composer-connected/);
  assert.match(source, /pi install git:github\.com\/eiei114\/pi-agent-bundles\r?\n/);
});

test("stale in-memory module regression: loader avoids static bundle imports", () => {
  const source = readFileSync(join(repoRoot, "shared/extensions/agent-bundle-loader.ts"), "utf8");
  assert.match(source, /await import\(importUrl\)/);
  assert.match(source, /await module\.default\(pi\)/);
  assert.doesNotMatch(source, /import cursorComposerBuilder from/);
  assert.doesNotMatch(source, /import piAceTurbo from/);
});
