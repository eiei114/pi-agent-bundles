import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function loadInternals(testRoot) {
  process.env.PI_AGENT_BUNDLES_TEST_ROOT = testRoot;
  const modulePath = join(repoRoot, "shared/extensions/bundle-git-sync.ts");
  const url = `${new URL(`file:///${modulePath.replace(/\\/g, "/")}`).href}?testRoot=${encodeURIComponent(testRoot)}&t=${Date.now()}`;
  const mod = await import(url);
  return mod.bundleGitSyncInternals;
}

function seedVerifiedRelease(internals, commit, tag = "v0.0.0") {
  const releaseRoot = join(internals.RELEASES_DIR, commit);
  mkdirSync(join(releaseRoot, "bundles/cursor-composer-builder/extensions"), { recursive: true });
  writeFileSync(join(releaseRoot, "package.json"), '{"name":"pi-agent-bundles"}\n', "utf8");
  writeFileSync(
    join(releaseRoot, "bundles/cursor-composer-builder/extensions/index.ts"),
    "export default async function bundle() {}\n",
    "utf8",
  );
  internals.writeVerifiedReleaseMarker(releaseRoot, commit, tag);
  return releaseRoot;
}

test("integration: concurrent activation lock rejects second acquirer", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-lock-"));
  try {
    const internals = await loadInternals(testRoot);
    mkdirSync(testRoot, { recursive: true });

    assert.equal(internals.acquireActivationLock(), true);
    assert.equal(internals.acquireActivationLock(), false);

    internals.releaseActivationLock();
    assert.equal(internals.acquireActivationLock(), true);
    internals.releaseActivationLock();
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: failed candidate keeps previous verified pointer", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-pointer-"));
  try {
    const internals = await loadInternals(testRoot);
    const previousCommit = "abc1234567890123456789012345678901234567890";
    const candidateCommit = "def1234567890123456789012345678901234567890";
    const previousRoot = seedVerifiedRelease(internals, previousCommit, "v0.1.0");

    internals.writeState({
      activeReleaseRoot: previousRoot,
      activeCommit: previousCommit,
      activeTag: "v0.1.0",
    });

    const result = internals.activateVerifiedRelease({
      state: internals.readState(),
      latestTag: "v0.2.0",
      latestCommit: candidateCommit,
      active: internals.getActiveRelease(),
    });

    assert.equal(result.updated, false);
    assert.equal(result.rollback, false);
    assert.match(result.error ?? "", /Failed to prepare activation staging worktree|git worktree add|not a git repository/);

    const state = internals.readState();
    assert.equal(state.activeCommit, previousCommit);
    assert.equal(state.activeReleaseRoot, previousRoot);
    assert.ok(state.lastActivationFailure);
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: failed validation prevents verified import url", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-import-"));
  try {
    const internals = await loadInternals(testRoot);
    process.env.PI_AGENT_BUNDLES_SYNC = "1";

    assert.throws(
      () => internals.resolveBundleImportUrl("cursor-composer-builder"),
      /No verified bundle release is active/,
    );

    const commit = "aaa1111111111111111111111111111111111111111";
    const releaseRoot = seedVerifiedRelease(internals, commit, "v9.9.9");
    internals.writeState({
      activeReleaseRoot: releaseRoot,
      activeCommit: commit,
      activeTag: "v9.9.9",
    });

    const importUrl = internals.resolveBundleImportUrl("cursor-composer-builder");
    assert.match(importUrl, /bundleCommit=aaa1111111111111111111111111111111111111111/);
    assert.match(importUrl, /cursor-composer-builder/);
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    delete process.env.PI_AGENT_BUNDLES_SYNC;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: activation does not mutate active lockfile or checkout head", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-head-"));
  try {
    const internals = await loadInternals(testRoot);
    mkdirSync(join(testRoot, ".git"), { recursive: true });
    writeFileSync(join(testRoot, "HEAD"), "ref: refs/heads/main\n", "utf8");
    writeFileSync(join(testRoot, "package-lock.json"), '{ "lockfileVersion": 3 }\n', "utf8");

    const headBefore = readFileSync(join(testRoot, "HEAD"), "utf8");
    const lockBefore = readFileSync(join(testRoot, "package-lock.json"), "utf8");

    internals.activateVerifiedRelease({
      state: {},
      latestTag: "v0.0.1",
      latestCommit: "bbb2222222222222222222222222222222222222222",
      active: internals.getActiveRelease(),
    });

    assert.equal(readFileSync(join(testRoot, "HEAD"), "utf8"), headBefore);
    assert.equal(readFileSync(join(testRoot, "package-lock.json"), "utf8"), lockBefore);
    assert.equal(existsSync(internals.LOCK_PATH), false);
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: stale lock becomes acquirable after ttl", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-stale-"));
  try {
    const internals = await loadInternals(testRoot);
    mkdirSync(testRoot, { recursive: true });

    writeFileSync(
      internals.LOCK_PATH,
      `${JSON.stringify({
        pid: 999999,
        startedAt: new Date(Date.now() - internals.LOCK_TTL_MS - 1000).toISOString(),
        heartbeatAt: new Date(Date.now() - internals.LOCK_TTL_MS - 1000).toISOString(),
      })}\n`,
      "utf8",
    );

    const lock = internals.readActivationLock();
    assert.equal(internals.isStaleActivationLock(lock), true);
    assert.equal(internals.acquireActivationLock(), true);
    internals.releaseActivationLock();
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});
