import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getActiveRelease, resolveBundleImportUrl, syncBundleGitCheckout } from "./bundle-git-sync.ts";

const bundleSlugs = [
  "cursor-composer-builder",
  "cursor-composer-core",
  "cursor-composer-connected",
  "cursor-patch-runner",
  "codex-release-engineer",
  "pi-glm-builder",
  "pi-ace",
  "pi-ace-balanced",
  "pi-ace-air",
  "pi-ace-turbo",
  "pi-spark-router",
  "pi-spark-scout",
  "pi-oss-orchestrator",
  "pi-extension-research-scout",
  "codex-spark-patch-runner",
  "multica-intake-agent",
  "multica-maintenance",
  "ios-cursor-builder",
  "ios-codex54-builder",
  "ios-codex55-fixer",
  "ios-codex55-planner",
] as const;

type BundleSlug = (typeof bundleSlugs)[number];

export default async function agentBundleLoader(pi: ExtensionAPI) {
  pi.registerFlag("agent-bundle", {
    description: "Load one pi-agent-bundles role profile by slug",
    type: "string",
  });

  const slug = getBundleSlug();
  if (!slug) return;

  const sync = syncBundleGitCheckout();
  if (sync.error) {
    pi.logger?.warn?.(`pi-agent-bundles auto-sync warning: ${sync.error}`);
  } else if (sync.updated) {
    pi.logger?.info?.(
      `pi-agent-bundles activated ${sync.commit ?? sync.tag ?? "release"} at ${sync.releaseRoot ?? "verified root"}`,
    );
  } else if (sync.rollback) {
    pi.logger?.warn?.(
      `pi-agent-bundles reverted to known-good release ${sync.commit ?? sync.tag ?? "previous"} after activation failure`,
    );
  }

  if (!isKnownBundleSlug(slug)) {
    throw new Error(`Unknown agent bundle '${slug}'. Known bundles: ${bundleSlugs.join(", ")}`);
  }

  const active = getActiveRelease();
  if (!active.verified) {
    const syncEnabled = !["0", "false", "off", "disabled"].includes(
      (process.env.PI_AGENT_BUNDLES_SYNC?.trim().toLowerCase() ?? ""),
    );
    if (syncEnabled) {
      throw new Error(
        "Refusing to load agent bundle before a verified release is active. Run sync successfully or disable PI_AGENT_BUNDLES_SYNC.",
      );
    }
  }

  const importUrl = resolveBundleImportUrl(slug);
  const module = await import(importUrl);
  await module.default(pi);
}

function isKnownBundleSlug(slug: BundleSlug | string): slug is BundleSlug {
  return (bundleSlugs as readonly string[]).includes(slug);
}

function getBundleSlug(): BundleSlug | undefined {
  const fromEnv = process.env.PI_AGENT_BUNDLE;
  const fromArgv = readArgValue("--agent-bundle");
  const raw = fromArgv ?? fromEnv;
  if (!raw) return undefined;
  return raw as BundleSlug;
}

function readArgValue(name: string): string | undefined {
  const prefix = `${name}=`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === name) return process.argv[index + 1];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}
