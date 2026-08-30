import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { syncBundleGitCheckout } from "./bundle-git-sync.ts";

const bundleLoaders = {
  "cursor-composer-builder": () => import("../../bundles/cursor-composer-builder/extensions/index.ts"),
  "cursor-composer-core": () => import("../../bundles/cursor-composer-core/extensions/index.ts"),
  "cursor-composer-connected": () => import("../../bundles/cursor-composer-connected/extensions/index.ts"),
  "cursor-patch-runner": () => import("../../bundles/cursor-patch-runner/extensions/index.ts"),
  "codex-release-engineer": () => import("../../bundles/codex-release-engineer/extensions/index.ts"),
  "pi-glm-builder": () => import("../../bundles/pi-glm-builder/extensions/index.ts"),
  "pi-ace": () => import("../../bundles/pi-ace/extensions/index.ts"),
  "pi-ace-balanced": () => import("../../bundles/pi-ace-balanced/extensions/index.ts"),
  "pi-ace-air": () => import("../../bundles/pi-ace-air/extensions/index.ts"),
  "pi-ace-turbo": () => import("../../bundles/pi-ace-turbo/extensions/index.ts"),
  "pi-spark-router": () => import("../../bundles/pi-spark-router/extensions/index.ts"),
  "pi-spark-scout": () => import("../../bundles/pi-spark-scout/extensions/index.ts"),
  "pi-oss-orchestrator": () => import("../../bundles/pi-oss-orchestrator/extensions/index.ts"),
  "pi-extension-research-scout": () => import("../../bundles/pi-extension-research-scout/extensions/index.ts"),
  "codex-spark-patch-runner": () => import("../../bundles/codex-spark-patch-runner/extensions/index.ts"),
  "multica-intake-agent": () => import("../../bundles/multica-intake-agent/extensions/index.ts"),
  "multica-maintenance": () => import("../../bundles/multica-maintenance/extensions/index.ts"),
  "ios-cursor-builder": () => import("../../bundles/ios-cursor-builder/extensions/index.ts"),
  "ios-codex54-builder": () => import("../../bundles/ios-codex54-builder/extensions/index.ts"),
  "ios-codex55-fixer": () => import("../../bundles/ios-codex55-fixer/extensions/index.ts"),
  "ios-codex55-planner": () => import("../../bundles/ios-codex55-planner/extensions/index.ts"),
} as const;

type BundleSlug = keyof typeof bundleLoaders;

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
    pi.logger?.info?.(`pi-agent-bundles updated to ${sync.commit ?? sync.tag ?? "latest tag"}`);
  } else if (sync.rollback) {
    pi.logger?.warn?.(
      `pi-agent-bundles kept known-good release ${sync.tag ?? sync.commit ?? "previous"} after activation failure`,
    );
  }

  const load = bundleLoaders[slug];
  if (!load) {
    const known = Object.keys(bundleLoaders).join(", ");
    throw new Error(`Unknown agent bundle '${slug}'. Known bundles: ${known}`);
  }

  const module = await load();
  await module.default(pi);
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
