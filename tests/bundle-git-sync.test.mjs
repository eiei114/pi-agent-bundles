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

test("agent bundle loader invokes auto-sync", () => {
  const path = join(repoRoot, "shared/extensions/agent-bundle-loader.ts");
  const source = readFileSync(path, "utf8");
  assert.match(source, /syncBundleGitCheckout\(/);
});

test("README documents auto-sync", () => {
  const source = readFileSync(join(repoRoot, "README.md"), "utf8");
  assert.match(source, /Auto-sync latest release tag/);
  assert.match(source, /PI_AGENT_BUNDLES_SYNC/);
  assert.match(source, /@latest/);
});
