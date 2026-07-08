import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SyncState = {
  lastGitSyncAt?: string;
  lastNpmInstallAt?: string;
  lastSyncedCommit?: string;
  lastSyncedTag?: string;
  lastError?: string;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STATE_PATH = join(REPO_ROOT, ".bundle-git-sync.json");
const TAG_PREFIX = process.env.PI_AGENT_BUNDLES_TAG_PREFIX?.trim() || "v";

export type BundleGitSyncResult = {
  attempted: boolean;
  updated: boolean;
  tag?: string;
  commit?: string;
  npmInstalled: boolean;
  skippedReason?: string;
  error?: string;
};

export function syncBundleGitCheckout(): BundleGitSyncResult {
  if (isDisabled()) {
    return { attempted: false, updated: false, npmInstalled: false, skippedReason: "disabled" };
  }

  if (!existsSync(join(REPO_ROOT, ".git"))) {
    return { attempted: false, updated: false, npmInstalled: false, skippedReason: "not-a-git-checkout" };
  }

  const state = readState();
  const force = isForced();
  const gitCooldownMs = readCooldownMinutes("PI_AGENT_BUNDLES_SYNC_MINUTES", 30) * 60 * 1000;
  const npmCooldownMs = readCooldownMinutes("PI_AGENT_BUNDLES_NPM_MINUTES", 360) * 60 * 1000;

  const fetch = runGit(["fetch", "--tags", "--prune", "origin"]);
  if (fetch.status !== 0) {
    const error = trimOutput(fetch.stderr || fetch.stdout) || "git fetch --tags failed";
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
      npmInstalled: false,
      error,
      tag: state.lastSyncedTag,
      commit: readCurrentCommit(),
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
      commit: readCurrentCommit(),
      tag: state.lastSyncedTag,
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
      lastError: undefined,
    });
    return {
      attempted: true,
      updated: false,
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
      npmInstalled: false,
      skippedReason: "dirty-working-tree",
      tag: currentTag ?? state.lastSyncedTag,
      commit: currentCommit,
      error: "Skip auto-sync because pi-agent-bundles has local changes.",
    };
  }

  const lockBefore = hashFile(join(REPO_ROOT, "package-lock.json"));
  const checkout = runGit(["checkout", "--detach", latestTag]);
  if (checkout.status !== 0) {
    const error = trimOutput(checkout.stderr || checkout.stdout) || `git checkout ${latestTag} failed`;
    writeState({ ...state, lastError: error });
    return {
      attempted: true,
      updated: false,
      npmInstalled: false,
      error,
      tag: currentTag ?? state.lastSyncedTag,
      commit: currentCommit,
    };
  }

  const commitAfter = readCurrentCommit();
  const updated = currentCommit !== commitAfter || currentTag !== latestTag;
  const lockAfter = hashFile(join(REPO_ROOT, "package-lock.json"));
  const lockChanged = lockBefore !== lockAfter;

  let npmInstalled = false;
  let npmError: string | undefined;

  const shouldInstall =
    lockChanged &&
    (force || !state.lastNpmInstallAt || Date.now() - Date.parse(state.lastNpmInstallAt) >= npmCooldownMs);

  if (shouldInstall) {
    const npm = spawnSync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 10 * 60 * 1000,
    });
    if (npm.status === 0) {
      npmInstalled = true;
    } else {
      npmError = trimOutput(npm.stderr || npm.stdout) || "npm install failed";
    }
  }

  writeState({
    lastGitSyncAt: new Date().toISOString(),
    lastSyncedTag: latestTag,
    lastSyncedCommit: commitAfter,
    lastNpmInstallAt: npmInstalled ? new Date().toISOString() : state.lastNpmInstallAt,
    lastError: npmError,
  });

  return {
    attempted: true,
    updated,
    npmInstalled,
    tag: latestTag,
    commit: commitAfter,
    error: npmError,
  };
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

function runGit(args: string[]) {
  return spawnSync("git", args, {
    cwd: REPO_ROOT,
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
