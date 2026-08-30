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
  mkdirSync(join(releaseRoot, "node_modules"), { recursive: true });
  writeFileSync(join(releaseRoot, "package.json"), '{"name":"pi-agent-bundles"}\n', "utf8");
  writeFileSync(join(releaseRoot, "package-lock.json"), '{ "lockfileVersion": 3, "packages": { "": {} } }\n', "utf8");
  writeFileSync(join(releaseRoot, "node_modules/.package-lock.json"), "{}\n", "utf8");
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

    const result = await internals.activateVerifiedRelease({
      state: internals.readState(),
      latestTag: "v0.2.0",
      latestCommit: candidateCommit,
      active: internals.getActiveRelease(),
    });

    assert.equal(result.updated, false);
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

    await internals.activateVerifiedRelease({
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

test("integration: alive owner with fresh heartbeat rejects stale challenger", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-challenger-"));
  try {
    const internals = await loadInternals(testRoot);
    mkdirSync(testRoot, { recursive: true });

    writeFileSync(
      internals.LOCK_PATH,
      `${JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
        heartbeatAt: new Date().toISOString(),
      })}\n`,
      "utf8",
    );

    const lock = internals.readActivationLock();
    assert.equal(internals.isStaleActivationLock(lock), false);
    assert.equal(internals.acquireActivationLock(), false);
    rmSync(internals.LOCK_PATH, { force: true });
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: heartbeat refresh keeps long-held lock non-stale", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-heartbeat-"));
  try {
    const internals = await loadInternals(testRoot);
    mkdirSync(testRoot, { recursive: true });
    assert.equal(internals.acquireActivationLock(), true);

    writeFileSync(
      internals.LOCK_PATH,
      `${JSON.stringify({
        pid: process.pid,
        startedAt: new Date(Date.now() - internals.LOCK_TTL_MS - 1000).toISOString(),
        heartbeatAt: new Date(Date.now() - internals.LOCK_TTL_MS - 1000).toISOString(),
      })}\n`,
      "utf8",
    );

    const staleBefore = internals.readActivationLock();
    assert.equal(internals.isStaleActivationLock(staleBefore), true);

    internals.refreshActivationLockHeartbeat();
    const refreshed = internals.readActivationLock();
    assert.equal(internals.isStaleActivationLock(refreshed), false);
    assert.equal(internals.acquireActivationLock(), false);

    internals.releaseActivationLock();
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: per-pid staging dirs do not collide", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-staging-"));
  try {
    const internals = await loadInternals(testRoot);
    const ownerA = internals.stagingDirForPid(1111);
    const ownerB = internals.stagingDirForPid(2222);
    assert.notEqual(ownerA, ownerB);

    mkdirSync(ownerA, { recursive: true });
    writeFileSync(join(ownerA, "owner.txt"), "a\n", "utf8");
    mkdirSync(ownerB, { recursive: true });
    writeFileSync(join(ownerB, "owner.txt"), "b\n", "utf8");

    assert.equal(readFileSync(join(ownerA, "owner.txt"), "utf8"), "a\n");
    assert.equal(readFileSync(join(ownerB, "owner.txt"), "utf8"), "b\n");
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});

test("integration: verified root requires package-lock hash and node_modules evidence", async () => {
  const testRoot = mkdtempSync(join(tmpdir(), "bundle-sync-marker-"));
  try {
    const internals = await loadInternals(testRoot);
    const commit = "ccc3333333333333333333333333333333333333333";
    const releaseRoot = join(internals.RELEASES_DIR, commit);
    mkdirSync(releaseRoot, { recursive: true });
    writeFileSync(join(releaseRoot, "package.json"), '{"name":"pi-agent-bundles"}\n', "utf8");
    writeFileSync(join(releaseRoot, "package-lock.json"), '{ "lockfileVersion": 3, "packages": { "": {} } }\n', "utf8");
    internals.writeVerifiedReleaseMarker(releaseRoot, commit, "v1.0.0");

    assert.equal(internals.isVerifiedReleaseRoot(releaseRoot, commit), false);

    mkdirSync(join(releaseRoot, "node_modules"), { recursive: true });
    writeFileSync(join(releaseRoot, "node_modules/.package-lock.json"), "{}\n", "utf8");
    assert.equal(internals.isVerifiedReleaseRoot(releaseRoot, commit), true);

    writeFileSync(join(releaseRoot, "package-lock.json"), '{ "lockfileVersion": 3, "packages": { "": { "changed": true } } }\n', "utf8");
    assert.equal(internals.isVerifiedReleaseRoot(releaseRoot, commit), false);
  } finally {
    delete process.env.PI_AGENT_BUNDLES_TEST_ROOT;
    rmSync(testRoot, { recursive: true, force: true });
  }
});