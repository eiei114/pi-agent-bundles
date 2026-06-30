import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiExtensionResearchScoutBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-extension-research-scout:bundle-status", {
    description: "Show Pi Extension Research Scout bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Extension Research Scout bundle loaded. Research/scout role for Pi extension ideas and evidence gathering.", "info");
    },
  });
}
