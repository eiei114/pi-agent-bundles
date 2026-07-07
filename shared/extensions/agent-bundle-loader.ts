import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import cursorComposerBuilder from "../../bundles/cursor-composer-builder/extensions/index.ts";
import cursorPatchRunner from "../../bundles/cursor-patch-runner/extensions/index.ts";
import codexReleaseEngineer from "../../bundles/codex-release-engineer/extensions/index.ts";
import piGlmBuilder from "../../bundles/pi-glm-builder/extensions/index.ts";
import piAce from "../../bundles/pi-ace/extensions/index.ts";
import piAceBalanced from "../../bundles/pi-ace-balanced/extensions/index.ts";
import piAceAir from "../../bundles/pi-ace-air/extensions/index.ts";
import piAceTurbo from "../../bundles/pi-ace-turbo/extensions/index.ts";
import piSparkRouter from "../../bundles/pi-spark-router/extensions/index.ts";
import piSparkScout from "../../bundles/pi-spark-scout/extensions/index.ts";
import piOssOrchestrator from "../../bundles/pi-oss-orchestrator/extensions/index.ts";
import piExtensionResearchScout from "../../bundles/pi-extension-research-scout/extensions/index.ts";
import codexSparkPatchRunner from "../../bundles/codex-spark-patch-runner/extensions/index.ts";
import multicaIntakeAgent from "../../bundles/multica-intake-agent/extensions/index.ts";
import multicaMaintenance from "../../bundles/multica-maintenance/extensions/index.ts";
import iosCursorBuilder from "../../bundles/ios-cursor-builder/extensions/index.ts";
import iosCodex54Builder from "../../bundles/ios-codex54-builder/extensions/index.ts";
import iosCodex55Fixer from "../../bundles/ios-codex55-fixer/extensions/index.ts";
import iosCodex55Planner from "../../bundles/ios-codex55-planner/extensions/index.ts";

const bundleLoaders = {
  "cursor-composer-builder": cursorComposerBuilder,
  "cursor-patch-runner": cursorPatchRunner,
  "codex-release-engineer": codexReleaseEngineer,
  "pi-glm-builder": piGlmBuilder,
  "pi-ace": piAce,
  "pi-ace-balanced": piAceBalanced,
  "pi-ace-air": piAceAir,
  "pi-ace-turbo": piAceTurbo,
  "pi-spark-router": piSparkRouter,
  "pi-spark-scout": piSparkScout,
  "pi-oss-orchestrator": piOssOrchestrator,
  "pi-extension-research-scout": piExtensionResearchScout,
  "codex-spark-patch-runner": codexSparkPatchRunner,
  "multica-intake-agent": multicaIntakeAgent,
  "multica-maintenance": multicaMaintenance,
  "ios-cursor-builder": iosCursorBuilder,
  "ios-codex54-builder": iosCodex54Builder,
  "ios-codex55-fixer": iosCodex55Fixer,
  "ios-codex55-planner": iosCodex55Planner,
} as const;

type BundleSlug = keyof typeof bundleLoaders;

export default async function agentBundleLoader(pi: ExtensionAPI) {
  pi.registerFlag("agent-bundle", {
    description: "Load one pi-agent-bundles role profile by slug",
    type: "string",
  });

  const slug = getBundleSlug();
  if (!slug) return;

  const load = bundleLoaders[slug];
  if (!load) {
    const known = Object.keys(bundleLoaders).join(", ");
    throw new Error(`Unknown agent bundle '${slug}'. Known bundles: ${known}`);
  }

  await load(pi);
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
