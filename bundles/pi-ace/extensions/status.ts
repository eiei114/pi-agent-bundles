import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiAceBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-ace:bundle-status", {
    description: "Show Pi Ace bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Ace bundle loaded. General high-capability Pi agent; keep default GLM primary and failure-only fallback support.", "info");
    },
  });
}
