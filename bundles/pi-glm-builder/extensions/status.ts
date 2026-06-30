import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiGlmBuilderBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-glm-builder:bundle-status", {
    description: "Show Pi GLM Builder bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi GLM Builder bundle loaded. Implementation fallback builder role, normally GLM-backed with model fallback available.", "info");
    },
  });
}
