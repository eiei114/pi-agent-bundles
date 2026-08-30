import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type SyncState = {
  activeReleaseRoot?: string;
  activeCommit?: string;
  activeTag?: string;
  previousReleaseRoot?: string;
  previousCommit?: string;
  previousTag?: string;
  lastGitSyncAt?: string;
  lastNpmInstallAt?: string;
  lastError?: string;
  lastActivationFailure?: string;
  /** @deprecated legacy pointer fields; migrated on read */
  lastSyncedCommit?: string;
  lastSyncedTag?: string;
  lastVerifiedTag?: string;
  lastVerifiedCommit?: string;
};

type ActivationLock = {
  pid: number;
  startedAt: string;
  heartbeatAt: string;
};

export type ActiveRelease = {
  root: string;
  commit: string;
  tag?: string;
  verified: boolean;
};

export type BundleGitSyncResult = {
  attempted: boolean;
  updated: boolean;
  /** true only when an in-flight pointer switch was reverted to the previous verified release */
  rollback: boolean;
  tag?: string;
  commit?: string;
  releaseRoot?: string;
  npmInstalled: boolean;
  skippedReason?: string;
  error?: string;
};

const DEFAULT_REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPO_ROOT = resolve(process.env.PI_AGENT_BUNDLES_TEST_ROOT?.trim() || DEFAULT_REPO_ROOT);
const STATE_PATH = join(REPO_ROOT, ".bundle-git-sync.json");
const LOCK_PATH = join(REPO_ROOT, ".bundle-activation.lock");
const RELEASES_DIR = join(REPO_ROOT, ".bundle-releases");
const STAGING_DIR = join(RELEASES_DIR, ".staging");
const LOCK_TTL_MS = readCooldownMinutes("PI_AGENT_BUNDLES_LOCK_MINUTES", 20) * 60 * 1000;
const TAG_PREFIX = process.env.PI_AGENT_BUNDLES_TAG_PREFIX?.trim() || "v";

export function getActiveRelease(): ActiveRelease {
  const state = normalizeState(readState());
  if (state.activeReleaseRoot && state.activeCommit && isVerifiedReleaseRoot(state.activeReleaseRoot, state.activeCommit)) {
    return {
      root: state.activeReleaseRoot,
      commit: state.activeCommit,
      tag: state.activeTag,
      verified: true,
    };
  }

  const bootstrapCommit = readCurrentCommit() ?? "bootstrap";
  return {
    root: REPO_ROOT,
    commit: bootstrapCommit,
    tag: resolveCurrentTag(),
    verified: false,
  };
}

export function resolveBundleImportUrl(slug: string): string {
  const active = getActiveRelease();
  if (!active.verified) {
    if (isDisabled()) {
      const bundlePath = join(REPO_ROOT, "bundles", slug, "extensions", "index.ts");
      if (!existsSync(bundlePath)) {
        throw new Error(`Installed checkout is missing bundle entry for '${slug}'.`);
      }
      return pathToFileURL(bundlePath).href;
    }
    throw new Error(
      "No verified bundle release is active; refusing to load role bundle from an unverified checkout.",
    );
  }

  return buildVerifiedBundleImportUrl(slug, active);
}

export function buildVerifiedBundleImportUrl(slug: string, active: ActiveRelease = getActiveRelease()): string {
  if (!active.verified) {
    throw new Error(
      "No verified bundle release is active; refusing to load role bundle from an unverified checkout.",
    );
  }

  const bundlePath = join(active.root, "bundles", slug, "extensions", "index.ts");
  if (!existsSync(bundlePath)) {
    throw new Error(`Verified release ${active.commit} is missing bundle entry for '${slug}'.`);
  }

  const url = new URL(pathToFileURL(bundlePath).href);
  url.searchParams.set("bundleCommit", active.commit);
  return url.href;
}

export function syncBundleGitCheckout(): BundleGitSyncResult {
  if (isDisabled()) {
    return { attempted: false, updated: false, rollback: false, npmInstalled: false, skippedReason: "disabled" };
  }

  if (!existsSync(join(REPO_ROOT, ".git"))) {
    return {
      attempted: false,
      updated: false,
      rollback: false,
      npmInstalled: false,
      skippedReason: "not-a-git-checkout",
    };
  }

  const state = normalizeState(readState());
  const force = isForced();
  const gitCooldownMs = readCooldownMinutes("PI_AGENT_BUNDLES_SYNC_MINUTES", 30) * 60 * 1000;
  const active = getActiveRelease();
  const knownGoodTag = active.tag ?? state.previousTag ?? state.lastVerifiedTag;
  const knownGoodCommit = active.verified ? active.commit : state.previousCommit ?? state.lastVerifiedCommit;

  const fetch = runGit(["fetch", "--tags", "--prune", "origin"]);
  if (fetch.status !== 0) {
    const error = trimOutput(fetch.stderr || fetch.stdout) || "git fetch --tags failed";
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  const latestTag = resolveLatestTag();
  if (!latestTag) {
    const error = `No ${TAG_PREFIX}* release tags found after git fetch --tags`;
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      commit: active.commit,
      tag: knownGoodTag,
      releaseRoot: active.root,
    };
  }

  const latestCommit = resolveTagCommit(latestTag);
  if (!latestCommit) {
    const error = `Could not resolve commit for tag ${latestTag}`;
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  if (!force && state.lastGitSyncAt && active.verified && active.tag === latestTag && active.commit === latestCommit) {
    const elapsed = Date.now() - Date.parse(state.lastGitSyncAt);
    if (elapsed < gitCooldownMs) {
      return {
        attempted: false,
        updated: false,
        rollback: false,
        npmInstalled: false,
        skippedReason: "git-cooldown",
        tag: latestTag,
        commit: active.commit,
        releaseRoot: active.root,
      };
    }
  }

  if (!force && active.verified && active.tag === latestTag && active.commit === latestCommit) {
    writeState({
      ...state,
      lastGitSyncAt: new Date().toISOString(),
      lastError: undefined,
      lastActivationFailure: undefined,
    });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      skippedReason: "already-on-latest-tag",
      tag: latestTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  if (!acquireActivationLock()) {
    return {
      attempted: false,
      updated: false,
      rollback: false,
      npmInstalled: false,
      skippedReason: "activation-in-progress",
      tag: knownGoodTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  try {
    return activateVerifiedRelease({
      state,
      latestTag,
      latestCommit,
      active,
    });
  } finally {
    releaseActivationLock();
    removeStagingWorktree();
  }
}

type ActivateVerifiedReleaseInput = {
  state: SyncState;
  latestTag: string;
  latestCommit: string;
  active: ActiveRelease;
};

function activateVerifiedRelease(input: ActivateVerifiedReleaseInput): BundleGitSyncResult {
  const { state, latestTag, latestCommit, active } = input;
  const knownGoodTag = active.tag ?? state.previousTag;
  const knownGoodCommit = active.verified ? active.commit : state.previousCommit;
  const knownGoodRoot = active.verified ? active.root : state.previousReleaseRoot;

  const existingRoot = releaseRootForCommit(latestCommit);
  if (isVerifiedReleaseRoot(existingRoot, latestCommit)) {
    const pointer = commitActiveRelease(state, {
      releaseRoot: existingRoot,
      commit: latestCommit,
      tag: latestTag,
      npmInstalled: false,
    });
    if (!pointer.ok) {
      return {
        attempted: true,
        updated: false,
        rollback: pointer.rollback,
        npmInstalled: false,
        error: pointer.error,
        tag: knownGoodTag,
        commit: knownGoodCommit ?? active.commit,
        releaseRoot: knownGoodRoot ?? active.root,
      };
    }

    return {
      attempted: true,
      updated: pointer.updated,
      rollback: false,
      npmInstalled: false,
      tag: latestTag,
      commit: latestCommit,
      releaseRoot: existingRoot,
    };
  }

  const staged = prepareStagingWorktree(latestTag, latestCommit);
  if (!staged.ok) {
    const error = staged.error ?? "Failed to prepare activation staging worktree";
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
    });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const npmStage = runNpmCi(STAGING_DIR);
  if (!npmStage.ok) {
    const error = npmStage.error ?? "npm ci failed in activation staging";
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
    });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const smoke = runActivationSmoke(STAGING_DIR);
  if (!smoke.ok) {
    const error = smoke.error ?? "activation smoke failed in staging";
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
    });
    return {
      attempted: true,
      updated: false,
      rollback: false,
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const releaseRoot = releaseRootForCommit(latestCommit);
  mkdirSync(RELEASES_DIR, { recursive: true });

  if (existsSync(releaseRoot)) {
    rmSync(releaseRoot, { recursive: true, force: true });
  }
  renameSync(STAGING_DIR, releaseRoot);
  writeVerifiedReleaseMarker(releaseRoot, latestCommit, latestTag);

  const pointer = commitActiveRelease(state, {
    releaseRoot,
    commit: latestCommit,
    tag: latestTag,
    npmInstalled: true,
  });
  if (!pointer.ok) {
    rmSync(releaseRoot, { recursive: true, force: true });
    return {
      attempted: true,
      updated: false,
      rollback: pointer.rollback,
      npmInstalled: true,
      error: pointer.error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  return {
    attempted: true,
    updated: pointer.updated,
    rollback: false,
    npmInstalled: true,
    tag: latestTag,
    commit: latestCommit,
    releaseRoot,
  };
}

function commitActiveRelease(
  state: SyncState,
  input: { releaseRoot: string; commit: string; tag: string; npmInstalled: boolean },
): { ok: boolean; updated: boolean; rollback: boolean; error?: string } {
  const previous = normalizeState(state);
  const hadVerified = Boolean(previous.activeReleaseRoot && previous.activeCommit);
  const changed =
    previous.activeReleaseRoot !== input.releaseRoot || previous.activeCommit !== input.commit;

  const nextState: SyncState = {
    ...previous,
    previousReleaseRoot: hadVerified ? previous.activeReleaseRoot : previous.previousReleaseRoot,
    previousCommit: hadVerified ? previous.activeCommit : previous.previousCommit,
    previousTag: hadVerified ? previous.activeTag : previous.previousTag,
    activeReleaseRoot: input.releaseRoot,
    activeCommit: input.commit,
    activeTag: input.tag,
    lastGitSyncAt: new Date().toISOString(),
    lastNpmInstallAt: input.npmInstalled ? new Date().toISOString() : previous.lastNpmInstallAt,
    lastError: undefined,
    lastActivationFailure: undefined,
  };

  try {
    writeState(nextState);
    return { ok: true, updated: changed, rollback: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist active release pointer";
    writeState({
      ...previous,
      lastError: message,
      lastActivationFailure: message,
    });
    return { ok: false, updated: false, rollback: false, error: message };
  }
}

function prepareStagingWorktree(tag: string, commit: string): { ok: boolean; error?: string } {
  removeStagingWorktree();
  mkdirSync(RELEASES_DIR, { recursive: true });

  const add = runGit(["worktree", "add", "--detach", STAGING_DIR, tag], REPO_ROOT);
  if (add.status !== 0) {
    return {
      ok: false,
      error: trimOutput(add.stderr || add.stdout) || `git worktree add ${tag} failed`,
    };
  }

  const resolved = readCommitAt(STAGING_DIR);
  if (resolved !== commit) {
    return {
      ok: false,
      error: `Staging worktree commit mismatch: expected ${commit}, got ${resolved ?? "unknown"}`,
    };
  }

  return { ok: true };
}

function removeStagingWorktree(): void {
  if (!existsSync(STAGING_DIR)) return;

  runGit(["worktree", "remove", "--force", STAGING_DIR], REPO_ROOT);
  if (existsSync(STAGING_DIR)) {
    rmSync(STAGING_DIR, { recursive: true, force: true });
  }
}

function releaseRootForCommit(commit: string): string {
  return join(RELEASES_DIR, commit);
}

function verifiedMarkerPath(releaseRoot: string): string {
  return join(releaseRoot, ".bundle-release-verified.json");
}

function writeVerifiedReleaseMarker(releaseRoot: string, commit: string, tag: string): void {
  mkdirSync(releaseRoot, { recursive: true });
  writeFileSync(
    verifiedMarkerPath(releaseRoot),
    `${JSON.stringify({ commit, tag, verifiedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

function isVerifiedReleaseRoot(releaseRoot: string, commit: string): boolean {
  const markerPath = verifiedMarkerPath(releaseRoot);
  if (!existsSync(markerPath)) return false;
  if (!existsSync(join(releaseRoot, "package.json"))) return false;
  try {
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as { commit?: string };
    return marker.commit === commit;
  } catch {
    return false;
  }
}

function runActivationSmoke(cwd: string): { ok: boolean; error?: string } {
  const npm = spawnSync("npm", ["run", "ci"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 15 * 60 * 1000,
  });
  if (npm.status === 0) return { ok: true };
  return {
    ok: false,
    error: trimOutput(npm.stderr || npm.stdout) || "npm run ci failed during activation smoke",
  };
}

function runNpmCi(cwd: string): { ok: boolean; error?: string } {
  const npm = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 10 * 60 * 1000,
  });
  if (npm.status === 0) return { ok: true };
  return {
    ok: false,
    error: trimOutput(npm.stderr || npm.stdout) || "npm ci failed",
  };
}

function acquireActivationLock(): boolean {
  if (existsSync(LOCK_PATH)) {
    const existing = readActivationLock();
    if (existing && !isStaleActivationLock(existing)) {
      return false;
    }
    rmSync(LOCK_PATH, { force: true });
  }

  const payload: ActivationLock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
  };

  try {
    writeFileSync(LOCK_PATH, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

function readActivationLock(): ActivationLock | undefined {
  if (!existsSync(LOCK_PATH)) return undefined;
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as ActivationLock;
  } catch {
    return undefined;
  }
}

function isStaleActivationLock(lock: ActivationLock): boolean {
  const heartbeatMs = Date.parse(lock.heartbeatAt || lock.startedAt);
  if (Number.isFinite(heartbeatMs) && Date.now() - heartbeatMs >= LOCK_TTL_MS) {
    return true;
  }
  if (!Number.isFinite(lock.pid) || lock.pid <= 0) return true;
  return !isProcessRunning(lock.pid);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function releaseActivationLock(): void {
  const lock = readActivationLock();
  if (lock?.pid === process.pid && existsSync(LOCK_PATH)) {
    rmSync(LOCK_PATH, { force: true });
  }
}

function isDisabled(): boolean {
  const raw = process.env.PI_AGENT_BUNDLES_SYNC?.trim().toLowerCase();
  return raw === "0" || raw === "false" || raw === "off" || raw === "disabled";
}

function isForced(): boolean {
  const raw = process.env.PI_AGENT_BUNDLES_SYNC?.trim().toLowerCase();
  return raw === "always" || raw === "force" || raw === "1";
}

function readCooldownMinutes(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeState(state: SyncState): SyncState {
  if (state.activeReleaseRoot && state.activeCommit) return state;

  const legacyCommit = state.lastVerifiedCommit ?? state.lastSyncedCommit;
  const legacyTag = state.lastVerifiedTag ?? state.lastSyncedTag;
  if (!legacyCommit) return state;

  const legacyRoot = releaseRootForCommit(legacyCommit);
  if (isVerifiedReleaseRoot(legacyRoot, legacyCommit)) {
    return {
      ...state,
      activeReleaseRoot: legacyRoot,
      activeCommit: legacyCommit,
      activeTag: legacyTag,
    };
  }

  return state;
}

function readState(): SyncState {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as SyncState;
  } catch {
    return {};
  }
}

function writeState(state: SyncState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const tempPath = `${STATE_PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempPath, STATE_PATH);
}

function resolveLatestTag(): string | undefined {
  const result = runGit(["tag", "-l", `${TAG_PREFIX}*`, "--sort=-version:refname"]);
  if (result.status !== 0) return undefined;
  const tags = trimOutput(result.stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return tags[0];
}

function resolveCurrentTag(): string | undefined {
  const exact = runGit(["describe", "--tags", "--exact-match"]);
  if (exact.status === 0) return trimOutput(exact.stdout);

  const latest = resolveLatestTag();
  if (!latest) return undefined;
  const head = readCurrentCommit();
  const latestCommit = resolveTagCommit(latest);
  return head && latestCommit && head === latestCommit ? latest : undefined;
}

function resolveTagCommit(tag: string): string | undefined {
  const result = runGit(["rev-parse", `${tag}^{commit}`]);
  if (result.status !== 0) return undefined;
  return trimOutput(result.stdout);
}

function readCurrentCommit(): string | undefined {
  return readCommitAt(REPO_ROOT);
}

function readCommitAt(cwd: string): string | undefined {
  const result = runGit(["rev-parse", "HEAD"], cwd);
  if (result.status !== 0) return undefined;
  return trimOutput(result.stdout);
}

function runGit(args: string[], cwd: string = REPO_ROOT) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 2 * 60 * 1000,
  });
}

function hashFile(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function trimOutput(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export const bundleGitSyncInternals = {
  REPO_ROOT,
  RELEASES_DIR,
  STAGING_DIR,
  STATE_PATH,
  LOCK_PATH,
  LOCK_TTL_MS,
  activateVerifiedRelease,
  acquireActivationLock,
  releaseActivationLock,
  buildVerifiedBundleImportUrl,
  resolveBundleImportUrl,
  commitActiveRelease,
  getActiveRelease,
  isVerifiedReleaseRoot,
  readActivationLock,
  isStaleActivationLock,
  readState,
  writeState,
  writeVerifiedReleaseMarker,
  hashFile,
};
