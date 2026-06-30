import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function multicaMaintenanceBundle(pi: ExtensionAPI) {
  pi.registerCommand("multica-bundle:status", {
    description: "Show Multica maintenance Pi bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Multica maintenance bundle loaded. Includes pi-model-fallback and fallback config seeding.", "info");
    },
  });
}
