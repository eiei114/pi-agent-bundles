import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("bundle git sync uses staged activation before checkout", () => {
  const source = readFileSync(join(repoRoot, "shared/extensions/bundle-git-sync.ts"), "utf8");
  assert.match(source, /worktree", "add"/);
  assert.match(source, /npm ci/);
  assert.match(source, /npm run ci/);
  assert.match(source, /rollback: true/);
  assert.match(source, /dirty-working-tree/);
  assert.doesNotMatch(source, /npm install/);
});

test("agent bundle loader syncs before dynamic bundle import", () => {
  const path = join(repoRoot, "shared/extensions/agent-bundle-loader.ts");
  const source = readFileSync(path, "utf8");
  assert.match(source, /syncBundleGitCheckout\(/);
  assert.match(source, /import\("\.\.\/\.\.\/bundles\//);
  assert.doesNotMatch(source, /^import .* from "\.\.\/\.\.\/bundles\//m);
  const syncIndex = source.indexOf("syncBundleGitCheckout(");
  const loadIndex = source.indexOf("const module = await load()");
  assert.ok(syncIndex >= 0 && loadIndex >= 0, "expected sync and dynamic load markers");
  assert.ok(syncIndex < loadIndex, "sync must run before dynamic bundle import");
});

test("README documents auto-sync", () => {
  const source = readFileSync(join(repoRoot, "README.md"), "utf8");
  assert.match(source, /Auto-sync latest release tag/);
  assert.match(source, /PI_AGENT_BUNDLES_SYNC/);
  assert.match(source, /git worktree/);
  assert.match(source, /pi install git:github\.com\/eiei114\/pi-agent-bundles\r?\n/);
});

test("dirty package-lock regression: sync skips instead of mutating checkout", () => {
  const source = readFileSync(join(repoRoot, "shared/extensions/bundle-git-sync.ts"), "utf8");
  assert.match(source, /isCleanWorkingTree\(\)/);
  assert.match(source, /Skip auto-sync because pi-agent-bundles has local changes/);
  assert.match(source, /rollbackToKnownGood/);
});

test("stale in-memory module regression: loader avoids static bundle imports", () => {
  const source = readFileSync(join(repoRoot, "shared/extensions/agent-bundle-loader.ts"), "utf8");
  assert.match(source, /const module = await load\(\)/);
  assert.match(source, /await module\.default\(pi\)/);
  assert.doesNotMatch(source, /import cursorComposerBuilder from/);
  assert.doesNotMatch(source, /import piAceTurbo from/);
});
