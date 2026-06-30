import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function MulticaMaintenanceBundle(pi: ExtensionAPI) {
  pi.registerCommand("multica-maintenance:bundle-status", {
    description: "Show Multica maintenance bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Multica maintenance bundle loaded. Includes pi-model-fallback and fallback config seeding.", "info");
    },
  });
}
