import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
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

type VerifiedReleaseMarker = {
  commit: string;
  tag: string;
  packageLockHash: string;
  verifiedAt: string;
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
const NPM_CI_TIMEOUT_MS = 10 * 60 * 1000;
const ACTIVATION_SMOKE_TIMEOUT_MS = 15 * 60 * 1000;
const LOCK_HEARTBEAT_INTERVAL_MS = 60 * 1000;
const LOCK_TTL_MS = Math.max(
  readCooldownMinutes("PI_AGENT_BUNDLES_LOCK_MINUTES", 30) * 60 * 1000,
  NPM_CI_TIMEOUT_MS + ACTIVATION_SMOKE_TIMEOUT_MS + 5 * 60 * 1000,
);
const TAG_PREFIX = process.env.PI_AGENT_BUNDLES_TAG_PREFIX?.trim() || "v";
const KILL_ESCALATION_MS = 10_000;
const TIMEOUT_SETTLE_MS = 30_000;
const GIT_SHA1_RE = /^[0-9a-f]{40}$/;
const RELEASE_SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const UNSAFE_REF_CHARS_RE = /[\x00-\x1f\x7f ~^:?*[\\]/;

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

  const bootstrap = resolvePackagedBootstrapRelease();
  if (bootstrap) return bootstrap;

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

export async function syncBundleGitCheckout(): Promise<BundleGitSyncResult> {
  if (isDisabled()) {
    return { attempted: false, updated: false, npmInstalled: false, skippedReason: "disabled" };
  }

  if (!existsSync(join(REPO_ROOT, ".git"))) {
    return {
      attempted: false,
      updated: false,
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
      npmInstalled: false,
      error,
      commit: active.commit,
      tag: knownGoodTag,
      releaseRoot: active.root,
    };
  }

  if (!isValidReleaseTag(latestTag)) {
    const error = `Rejected unsafe or invalid release tag: ${latestTag}`;
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
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
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  if (!isValidCommitHash(latestCommit)) {
    const error = `Rejected unsafe commit hash for tag ${latestTag}`;
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
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
      npmInstalled: false,
      skippedReason: "activation-in-progress",
      tag: knownGoodTag,
      commit: active.commit,
      releaseRoot: active.root,
    };
  }

  try {
    return await activateVerifiedRelease({
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

async function activateVerifiedRelease(input: ActivateVerifiedReleaseInput): Promise<BundleGitSyncResult> {
  const { state, latestTag, latestCommit, active } = input;
  const knownGoodTag = active.tag ?? state.previousTag;
  const knownGoodCommit = active.verified ? active.commit : state.previousCommit;
  const knownGoodRoot = active.verified ? active.root : state.previousReleaseRoot;
  const stagingDir = stagingDirForPid();

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
      npmInstalled: false,
      tag: latestTag,
      commit: latestCommit,
      releaseRoot: existingRoot,
    };
  }

  const staged = prepareStagingWorktree(stagingDir, latestTag, latestCommit);
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
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const npmStage = await runNpmCi(stagingDir);
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
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const smoke = await runActivationSmoke(stagingDir);
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
      npmInstalled: false,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  const promotion = resolvePromotionTarget(latestCommit, state);
  mkdirSync(RELEASES_DIR, { recursive: true });

  const promoted = promoteStagingWorktree(
    stagingDir,
    promotion.targetRoot,
    promotion.removeExistingTarget,
  );
  if (!promoted.ok) {
    const error = promoted.error ?? "Failed to promote activation staging worktree";
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
    });
    return {
      attempted: true,
      updated: false,
      npmInstalled: true,
      error,
      tag: knownGoodTag,
      commit: knownGoodCommit ?? active.commit,
      releaseRoot: knownGoodRoot ?? active.root,
    };
  }

  writeVerifiedReleaseMarker(promotion.targetRoot, latestCommit, latestTag);

  const pointer = commitActiveRelease(state, {
    releaseRoot: promotion.targetRoot,
    commit: latestCommit,
    tag: latestTag,
    npmInstalled: true,
  });
  if (!pointer.ok) {
    return {
      attempted: true,
      updated: false,
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
    npmInstalled: true,
    tag: latestTag,
    commit: latestCommit,
    releaseRoot: promotion.targetRoot,
  };
}

function commitActiveRelease(
  state: SyncState,
  input: { releaseRoot: string; commit: string; tag: string; npmInstalled: boolean },
): { ok: boolean; updated: boolean; error?: string } {
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
    return { ok: true, updated: changed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist active release pointer";
    try {
      writeState({
        ...previous,
        lastError: message,
        lastActivationFailure: message,
      });
    } catch {
      // State persistence is unavailable; keep the previous on-disk pointer.
    }
    return { ok: false, updated: false, error: message };
  }
}

function stagingDirForPid(pid: number = process.pid): string {
  return join(RELEASES_DIR, `.staging.${pid}`);
}

function prepareStagingWorktree(
  stagingDir: string,
  tag: string,
  commit: string,
): { ok: boolean; error?: string } {
  removeStagingWorktree(stagingDir);
  mkdirSync(RELEASES_DIR, { recursive: true });

  const add = runGit(["worktree", "add", "--detach", stagingDir, tag], REPO_ROOT);
  if (add.status !== 0) {
    return {
      ok: false,
      error: trimOutput(add.stderr || add.stdout) || `git worktree add ${tag} failed`,
    };
  }

  const resolved = readCommitAt(stagingDir);
  if (resolved !== commit) {
    return {
      ok: false,
      error: `Staging worktree commit mismatch: expected ${commit}, got ${resolved ?? "unknown"}`,
    };
  }

  return { ok: true };
}

function removeStagingWorktree(stagingDir: string = stagingDirForPid()): void {
  if (!existsSync(stagingDir)) {
    pruneWorktrees();
    return;
  }

  runGit(["worktree", "remove", "--force", stagingDir], REPO_ROOT);
  if (existsSync(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  pruneWorktrees();
}

function pruneWorktrees(): void {
  runGit(["worktree", "prune"], REPO_ROOT);
}

function removeReleaseWorktree(releaseRoot: string): void {
  if (!existsSync(releaseRoot)) return;

  runGit(["worktree", "remove", "--force", releaseRoot], REPO_ROOT);
  if (existsSync(releaseRoot)) {
    rmSync(releaseRoot, { recursive: true, force: true });
  }
  pruneWorktrees();
}

function getProtectedReleaseRoots(state: SyncState): Set<string> {
  const normalized = normalizeState(state);
  const protectedRoots = new Set<string>();
  if (normalized.activeReleaseRoot) {
    protectedRoots.add(resolve(normalized.activeReleaseRoot));
  }
  if (normalized.previousReleaseRoot) {
    protectedRoots.add(resolve(normalized.previousReleaseRoot));
  }
  return protectedRoots;
}

function isProtectedReleaseRoot(releaseRoot: string, state: SyncState): boolean {
  return getProtectedReleaseRoots(state).has(resolve(releaseRoot));
}

function repairRootForCommit(commit: string): string {
  return join(RELEASES_DIR, `${commit}.repair.${Date.now()}.${process.pid}`);
}

function resolvePromotionTarget(
  commit: string,
  state: SyncState,
): { targetRoot: string; removeExistingTarget: boolean } {
  const canonicalRoot = releaseRootForCommit(commit);
  if (!existsSync(canonicalRoot)) {
    return { targetRoot: canonicalRoot, removeExistingTarget: false };
  }
  if (isVerifiedReleaseRoot(canonicalRoot, commit)) {
    return { targetRoot: canonicalRoot, removeExistingTarget: false };
  }
  if (isProtectedReleaseRoot(canonicalRoot, state)) {
    return { targetRoot: repairRootForCommit(commit), removeExistingTarget: false };
  }
  return { targetRoot: canonicalRoot, removeExistingTarget: true };
}

function promoteStagingWorktree(
  stagingDir: string,
  releaseRoot: string,
  removeExistingTarget = false,
): { ok: boolean; error?: string } {
  if (existsSync(releaseRoot)) {
    if (!removeExistingTarget) {
      return {
        ok: false,
        error: `Release root already exists: ${releaseRoot}`,
      };
    }
    removeReleaseWorktree(releaseRoot);
  }

  const move = runGit(["worktree", "move", stagingDir, releaseRoot], REPO_ROOT);
  if (move.status !== 0) {
    return {
      ok: false,
      error: trimOutput(move.stderr || move.stdout) || "git worktree move failed",
    };
  }

  pruneWorktrees();
  return { ok: true };
}

function resolveNpmCliPath(): string {
  const candidates: string[] = [];

  const npmExecpath = process.env.npm_execpath?.trim();
  if (npmExecpath && isAbsolute(npmExecpath) && existsSync(npmExecpath)) {
    const npmCliName = npmExecpath.split(/[/\\]/).pop();
    if (npmCliName === "npm-cli.js") {
      candidates.push(resolve(npmExecpath));
    }
  }

  candidates.push(
    resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "npm CLI unavailable: no validated absolute npm-cli.js candidate (npm_execpath or Node-adjacent npm CLI)",
  );
}

function resolveNpmInvocation(npmArgs: string[]): { command: string; args: string[] } {
  const npmCli = resolveNpmCliPath();
  return {
    command: process.execPath,
    args: [npmCli, ...npmArgs],
  };
}

function releaseRootForCommit(commit: string): string {
  return join(RELEASES_DIR, commit);
}

function verifiedMarkerPath(releaseRoot: string): string {
  return join(releaseRoot, ".bundle-release-verified.json");
}

function writeVerifiedReleaseMarker(releaseRoot: string, commit: string, tag: string): void {
  const packageLockHash = hashFile(join(releaseRoot, "package-lock.json"));
  if (!packageLockHash) {
    throw new Error(`Cannot write verified marker without package-lock.json in ${releaseRoot}`);
  }

  mkdirSync(releaseRoot, { recursive: true });
  const marker: VerifiedReleaseMarker = {
    commit,
    tag,
    packageLockHash,
    verifiedAt: new Date().toISOString(),
  };
  writeFileSync(verifiedMarkerPath(releaseRoot), `${JSON.stringify(marker, null, 2)}\n`, "utf8");
}

function isVerifiedReleaseRoot(releaseRoot: string, commit: string): boolean {
  const markerPath = verifiedMarkerPath(releaseRoot);
  if (!existsSync(markerPath)) return false;
  if (!existsSync(join(releaseRoot, "package.json"))) return false;
  if (!hasNodeModulesEvidence(releaseRoot)) return false;

  const packageLockHash = hashFile(join(releaseRoot, "package-lock.json"));
  if (!packageLockHash) return false;

  try {
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as VerifiedReleaseMarker;
    return marker.commit === commit && marker.packageLockHash === packageLockHash;
  } catch {
    return false;
  }
}

function hasNodeModulesEvidence(releaseRoot: string): boolean {
  return (
    existsSync(join(releaseRoot, "node_modules")) &&
    existsSync(join(releaseRoot, "node_modules", ".package-lock.json"))
  );
}

async function runActivationSmoke(cwd: string): Promise<{ ok: boolean; error?: string }> {
  let invocation: { command: string; args: string[] };
  try {
    invocation = resolveNpmInvocation(["run", "ci"]);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "npm CLI unavailable",
    };
  }

  return runCommandWithLockHeartbeat(invocation.command, invocation.args, {
    cwd,
    timeoutMs: ACTIVATION_SMOKE_TIMEOUT_MS,
    failureMessage: "npm run ci failed during activation smoke",
  });
}

async function runNpmCi(cwd: string): Promise<{ ok: boolean; error?: string }> {
  let invocation: { command: string; args: string[] };
  try {
    invocation = resolveNpmInvocation(["ci", "--no-audit", "--no-fund"]);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "npm CLI unavailable",
    };
  }

  return runCommandWithLockHeartbeat(invocation.command, invocation.args, {
    cwd,
    timeoutMs: NPM_CI_TIMEOUT_MS,
    failureMessage: "npm ci failed",
  });
}

async function runCommandWithLockHeartbeat(
  command: string,
  args: string[],
  input: { cwd: string; timeoutMs: number; failureMessage: string },
): Promise<{ ok: boolean; error?: string }> {
  refreshActivationLockHeartbeat();

  return new Promise((resolvePromise) => {
    const child: ChildProcess = spawn(command, args, {
      cwd: input.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let heartbeat: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;
    let killEscalation: NodeJS.Timeout | undefined;
    let settleTimeout: NodeJS.Timeout | undefined;

    const finish = (result: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (timeout) clearTimeout(timeout);
      if (killEscalation) clearTimeout(killEscalation);
      if (settleTimeout) clearTimeout(settleTimeout);
      resolvePromise(result);
    };

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    heartbeat = setInterval(() => {
      refreshActivationLockHeartbeat();
    }, LOCK_HEARTBEAT_INTERVAL_MS);

    timeout = setTimeout(() => {
      timedOut = true;
      killProcessTree(child, false);
      killEscalation = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          killProcessTree(child, true);
        }
      }, KILL_ESCALATION_MS);
      killEscalation.unref?.();
      settleTimeout = setTimeout(() => {
        finish({
          ok: false,
          error: `${input.failureMessage} (timed out after ${input.timeoutMs}ms)`,
        });
      }, TIMEOUT_SETTLE_MS);
      settleTimeout.unref?.();
    }, input.timeoutMs);

    child.on("close", (code) => {
      if (code === 0 && !timedOut) {
        refreshActivationLockHeartbeat();
        finish({ ok: true });
        return;
      }
      finish({
        ok: false,
        error: timedOut
          ? `${input.failureMessage} (timed out after ${input.timeoutMs}ms)`
          : trimOutput(stderr || stdout) || input.failureMessage,
      });
    });

    child.on("error", (error) => {
      finish({
        ok: false,
        error: error instanceof Error ? error.message : input.failureMessage,
      });
    });
  });
}

function killProcessTree(child: ChildProcess, force: boolean): void {
  const pid = child.pid;
  if (!pid) {
    child.kill(force ? "SIGKILL" : "SIGTERM");
    return;
  }

  if (process.platform === "win32") {
    const args = force ? ["/PID", String(pid), "/T", "/F"] : ["/PID", String(pid), "/T"];
    spawnSync("taskkill", args, { shell: false });
    return;
  }

  child.kill(force ? "SIGKILL" : "SIGTERM");
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

function refreshActivationLockHeartbeat(): void {
  const lock = readActivationLock();
  if (lock?.pid !== process.pid || !existsSync(LOCK_PATH)) return;
  writeFileSync(
    LOCK_PATH,
    `${JSON.stringify({ ...lock, heartbeatAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

function isStaleActivationLock(lock: ActivationLock): boolean {
  if (!Number.isFinite(lock.pid) || lock.pid <= 0) return true;

  const ownerAlive = isProcessRunning(lock.pid);
  const heartbeatMs = Date.parse(lock.heartbeatAt || lock.startedAt);
  const heartbeatExpired = Number.isFinite(heartbeatMs) && Date.now() - heartbeatMs >= LOCK_TTL_MS;

  if (ownerAlive && !heartbeatExpired) return false;
  if (!ownerAlive) return true;
  return heartbeatExpired;
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
    .filter(Boolean)
    .filter(isValidReleaseTag);
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
  if (!isValidReleaseTag(tag)) return undefined;
  const result = runGit(["rev-parse", `${tag}^{commit}`]);
  if (result.status !== 0) return undefined;
  const commit = trimOutput(result.stdout).toLowerCase();
  return isValidCommitHash(commit) ? commit : undefined;
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
    shell: false,
    timeout: 2 * 60 * 1000,
  });
}

function isValidGitRefname(ref: string): boolean {
  if (!ref || ref.length > 255) return false;
  if (ref.endsWith(".") || ref.endsWith(".lock")) return false;
  if (ref.includes("..") || ref.includes("@{") || ref.includes("//")) return false;
  if (UNSAFE_REF_CHARS_RE.test(ref)) return false;

  for (const segment of ref.split("/")) {
    if (!segment || segment.startsWith(".") || segment.endsWith(".lock")) return false;
    if (segment.endsWith(".")) return false;
  }

  return true;
}

function isValidReleaseTag(tag: string): boolean {
  if (!isValidGitRefname(tag)) return false;
  if (!tag.startsWith(TAG_PREFIX)) return false;
  return RELEASE_SEMVER_RE.test(tag.slice(TAG_PREFIX.length));
}

function isValidCommitHash(commit: string): boolean {
  return GIT_SHA1_RE.test(commit);
}

function resolvePackagedBootstrapRelease(): ActiveRelease | undefined {
  if (!existsSync(join(REPO_ROOT, ".git"))) return undefined;

  const exactTag = runGit(["describe", "--tags", "--exact-match"]);
  if (exactTag.status !== 0) return undefined;

  const tag = trimOutput(exactTag.stdout);
  if (!tag.startsWith(TAG_PREFIX)) return undefined;

  const commit = readCurrentCommit();
  if (!commit) return undefined;
  if (!isCleanEnoughForBootstrap()) return undefined;
  if (!hasNodeModulesEvidence(REPO_ROOT)) return undefined;
  if (!existsSync(join(REPO_ROOT, "bundles/cursor-composer-builder/extensions/index.ts"))) return undefined;

  const smoke = runBootstrapDependencySmoke();
  if (!smoke.ok) return undefined;

  return {
    root: REPO_ROOT,
    commit,
    tag,
    verified: true,
  };
}

function isCleanEnoughForBootstrap(): boolean {
  const status = runGit(["status", "--porcelain"], REPO_ROOT);
  if (status.status !== 0) return false;

  const dirtyPaths = trimOutput(status.stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());

  if (dirtyPaths.length === 0) return true;
  return dirtyPaths.every((path) => path === "package-lock.json" || path.endsWith("/package-lock.json"));
}

function runBootstrapDependencySmoke(): { ok: boolean; error?: string } {
  let invocation: { command: string; args: string[] };
  try {
    invocation = resolveNpmInvocation(["run", "check:cursor-deps"]);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "npm CLI unavailable",
    };
  }

  const npm = spawnSync(invocation.command, invocation.args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
    timeout: 2 * 60 * 1000,
  });
  if (npm.status === 0) return { ok: true };
  return {
    ok: false,
    error: trimOutput(npm.stderr || npm.stdout) || "bootstrap dependency smoke failed",
  };
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
  stagingDirForPid,
  STATE_PATH,
  LOCK_PATH,
  LOCK_TTL_MS,
  LOCK_HEARTBEAT_INTERVAL_MS,
  KILL_ESCALATION_MS,
  TIMEOUT_SETTLE_MS,
  activateVerifiedRelease,
  acquireActivationLock,
  releaseActivationLock,
  refreshActivationLockHeartbeat,
  buildVerifiedBundleImportUrl,
  resolveBundleImportUrl,
  commitActiveRelease,
  getActiveRelease,
  isVerifiedReleaseRoot,
  hasNodeModulesEvidence,
  readActivationLock,
  isStaleActivationLock,
  isProcessRunning,
  readState,
  writeState,
  writeVerifiedReleaseMarker,
  resolvePackagedBootstrapRelease,
  hashFile,
  isValidReleaseTag,
  isValidCommitHash,
  isValidGitRefname,
  runCommandWithLockHeartbeat,
  pruneWorktrees,
  promoteStagingWorktree,
  removeReleaseWorktree,
  getProtectedReleaseRoots,
  isProtectedReleaseRoot,
  repairRootForCommit,
  resolvePromotionTarget,
  releaseRootForCommit,
  resolveNpmCliPath,
  resolveNpmInvocation,
  prepareStagingWorktree,
};
