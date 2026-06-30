import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiAceAirBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-ace-air:bundle-status", {
    description: "Show Pi Ace Air bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Ace Air bundle loaded. Lightweight vault organizer and routine low-cost automation role.", "info");
    },
  });
}
