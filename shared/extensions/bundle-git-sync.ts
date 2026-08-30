import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SyncState = {
  lastGitSyncAt?: string;
  lastNpmInstallAt?: string;
  lastSyncedCommit?: string;
  lastSyncedTag?: string;
  lastVerifiedTag?: string;
  lastVerifiedCommit?: string;
  lastError?: string;
  lastActivationFailure?: string;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STATE_PATH = join(REPO_ROOT, ".bundle-git-sync.json");
const LOCK_PATH = join(REPO_ROOT, ".bundle-activation.lock");
const STAGING_DIR = join(REPO_ROOT, ".bundle-activation-staging");
const TAG_PREFIX = process.env.PI_AGENT_BUNDLES_TAG_PREFIX?.trim() || "v";

export type BundleGitSyncResult = {
  attempted: boolean;
  updated: boolean;
  rollback: boolean;
  tag?: string;
  commit?: string;
  npmInstalled: boolean;
  skippedReason?: string;
  error?: string;
};

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

  const state = readState();
  const force = isForced();
  const gitCooldownMs = readCooldownMinutes("PI_AGENT_BUNDLES_SYNC_MINUTES", 30) * 60 * 1000;
  const knownGoodTag = state.lastVerifiedTag ?? state.lastSyncedTag;
  const knownGoodCommit = state.lastVerifiedCommit ?? state.lastSyncedCommit ?? readCurrentCommit();

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
      commit: readCurrentCommit() ?? knownGoodCommit,
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
      commit: readCurrentCommit() ?? knownGoodCommit,
      tag: knownGoodTag,
    };
  }

  const currentTag = resolveCurrentTag();
  const currentCommit = readCurrentCommit();
  const latestCommit = resolveTagCommit(latestTag);

  if (!force && state.lastGitSyncAt && currentTag === latestTag) {
    const elapsed = Date.now() - Date.parse(state.lastGitSyncAt);
    if (elapsed < gitCooldownMs) {
      return {
        attempted: false,
        updated: false,
        rollback: false,
        npmInstalled: false,
        skippedReason: "git-cooldown",
        tag: latestTag,
        commit: currentCommit,
      };
    }
  }

  if (!force && currentTag === latestTag && currentCommit === latestCommit) {
    writeState({
      ...state,
      lastGitSyncAt: new Date().toISOString(),
      lastSyncedTag: latestTag,
      lastSyncedCommit: currentCommit,
      lastVerifiedTag: latestTag,
      lastVerifiedCommit: currentCommit,
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
      commit: currentCommit,
    };
  }

  if (!isCleanWorkingTree()) {
    return {
      attempted: false,
      updated: false,
      rollback: false,
      npmInstalled: false,
      skippedReason: "dirty-working-tree",
      tag: currentTag ?? knownGoodTag,
      commit: currentCommit ?? knownGoodCommit,
      error: "Skip auto-sync because pi-agent-bundles has local changes.",
    };
  }

  if (!acquireActivationLock()) {
    return {
      attempted: false,
      updated: false,
      rollback: false,
      npmInstalled: false,
      skippedReason: "activation-in-progress",
      tag: currentTag ?? knownGoodTag,
      commit: currentCommit ?? knownGoodCommit,
    };
  }

  try {
    return activateVerifiedRelease({
      state,
      latestTag,
      currentTag,
      currentCommit,
      knownGoodTag,
      knownGoodCommit,
    });
  } finally {
    releaseActivationLock();
    removeStagingWorktree();
  }
}

type ActivateVerifiedReleaseInput = {
  state: SyncState;
  latestTag: string;
  currentTag?: string;
  currentCommit?: string;
  knownGoodTag?: string;
  knownGoodCommit?: string;
};

function activateVerifiedRelease(input: ActivateVerifiedReleaseInput): BundleGitSyncResult {
  const { state, latestTag, currentTag, currentCommit, knownGoodTag, knownGoodCommit } = input;

  const staged = prepareStagingWorktree(latestTag);
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
      rollback: true,
      npmInstalled: false,
      error,
      tag: knownGoodTag ?? currentTag,
      commit: currentCommit ?? knownGoodCommit,
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
      rollback: true,
      npmInstalled: false,
      error,
      tag: knownGoodTag ?? currentTag,
      commit: currentCommit ?? knownGoodCommit,
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
      rollback: true,
      npmInstalled: false,
      error,
      tag: knownGoodTag ?? currentTag,
      commit: currentCommit ?? knownGoodCommit,
    };
  }

  const checkout = runGit(["checkout", "--detach", latestTag], REPO_ROOT);
  if (checkout.status !== 0) {
    const error = trimOutput(checkout.stderr || checkout.stdout) || `git checkout ${latestTag} failed`;
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
    });
    return {
      attempted: true,
      updated: false,
      rollback: true,
      npmInstalled: false,
      error,
      tag: knownGoodTag ?? currentTag,
      commit: currentCommit ?? knownGoodCommit,
    };
  }

  const commitAfter = readCurrentCommit();
  const updated = currentCommit !== commitAfter || currentTag !== latestTag;
  const npmActive = runNpmCi(REPO_ROOT);
  let npmInstalled = false;
  let npmError: string | undefined;

  if (npmActive.ok) {
    npmInstalled = true;
  } else {
    npmError = npmActive.error ?? "npm ci failed after activation checkout";
    const rollback = rollbackToKnownGood(knownGoodTag, knownGoodCommit);
    writeState({
      ...state,
      lastError: npmError,
      lastActivationFailure: npmError,
      lastSyncedTag: rollback.tag ?? state.lastSyncedTag,
      lastSyncedCommit: rollback.commit ?? state.lastSyncedCommit,
    });
    return {
      attempted: true,
      updated: false,
      rollback: true,
      npmInstalled: false,
      error: npmError,
      tag: rollback.tag ?? knownGoodTag ?? currentTag,
      commit: rollback.commit ?? knownGoodCommit ?? currentCommit,
    };
  }

  if (!isCleanWorkingTree()) {
    const error = "Activation left a dirty working tree; keeping previous verified release pointer.";
    const rollback = rollbackToKnownGood(knownGoodTag, knownGoodCommit);
    writeState({
      ...state,
      lastError: error,
      lastActivationFailure: error,
      lastSyncedTag: rollback.tag ?? state.lastSyncedTag,
      lastSyncedCommit: rollback.commit ?? state.lastSyncedCommit,
    });
    return {
      attempted: true,
      updated: false,
      rollback: true,
      npmInstalled: false,
      error,
      tag: rollback.tag ?? knownGoodTag ?? currentTag,
      commit: rollback.commit ?? knownGoodCommit ?? currentCommit,
    };
  }

  writeState({
    lastGitSyncAt: new Date().toISOString(),
    lastSyncedTag: latestTag,
    lastSyncedCommit: commitAfter,
    lastVerifiedTag: latestTag,
    lastVerifiedCommit: commitAfter,
    lastNpmInstallAt: npmInstalled ? new Date().toISOString() : state.lastNpmInstallAt,
    lastError: npmError,
    lastActivationFailure: undefined,
  });

  return {
    attempted: true,
    updated,
    rollback: false,
    npmInstalled,
    tag: latestTag,
    commit: commitAfter,
    error: npmError,
  };
}

function prepareStagingWorktree(tag: string): { ok: boolean; error?: string } {
  removeStagingWorktree();

  const add = runGit(["worktree", "add", "--detach", STAGING_DIR, tag], REPO_ROOT);
  if (add.status !== 0) {
    return {
      ok: false,
      error: trimOutput(add.stderr || add.stdout) || `git worktree add ${tag} failed`,
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

function rollbackToKnownGood(
  tag: string | undefined,
  commit: string | undefined,
): { tag?: string; commit?: string } {
  if (tag) {
    const checkout = runGit(["checkout", "--detach", tag], REPO_ROOT);
    if (checkout.status === 0) {
      runNpmCi(REPO_ROOT);
      return { tag, commit: readCurrentCommit() ?? commit };
    }
  }

  if (commit) {
    const checkout = runGit(["checkout", "--detach", commit], REPO_ROOT);
    if (checkout.status === 0) {
      runNpmCi(REPO_ROOT);
      return { tag: resolveCurrentTag(), commit: readCurrentCommit() ?? commit };
    }
  }

  return { tag, commit };
}

function acquireActivationLock(): boolean {
  if (existsSync(LOCK_PATH)) {
    try {
      const ageMs = Date.now() - Date.parse(readFileSync(LOCK_PATH, "utf8"));
      if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) return false;
    } catch {
      return false;
    }
  }

  writeFileSync(LOCK_PATH, new Date().toISOString(), "utf8");
  return true;
}

function releaseActivationLock(): void {
  if (existsSync(LOCK_PATH)) rmSync(LOCK_PATH, { force: true });
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
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
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
  const result = runGit(["rev-parse", "HEAD"]);
  if (result.status !== 0) return undefined;
  return trimOutput(result.stdout);
}

function isCleanWorkingTree(): boolean {
  const result = runGit(["status", "--porcelain"]);
  if (result.status !== 0) return false;
  return trimOutput(result.stdout).length === 0;
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
  STAGING_DIR,
  activateVerifiedRelease,
  isCleanWorkingTree,
  hashFile,
  readState,
  writeState,
};
