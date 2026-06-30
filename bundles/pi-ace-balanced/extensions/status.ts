import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiAceBalancedBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-ace-balanced:bundle-status", {
    description: "Show Pi Ace Balanced bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Ace Balanced bundle loaded. Balanced controller/sentinel role for routine Multica maintenance.", "info");
    },
  });
}
