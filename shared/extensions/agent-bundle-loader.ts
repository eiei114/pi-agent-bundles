import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import iosCursorBuilder from "../../bundles/ios-cursor-builder/extensions/index.ts";
import iosCodex54Builder from "../../bundles/ios-codex54-builder/extensions/index.ts";
import iosCodex55Fixer from "../../bundles/ios-codex55-fixer/extensions/index.ts";
import iosCodex55Planner from "../../bundles/ios-codex55-planner/extensions/index.ts";

const bundleLoaders = {
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
