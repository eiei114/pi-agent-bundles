import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiAceTurboBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-ace-turbo:bundle-status", {
    description: "Show Pi Ace Turbo bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Ace Turbo bundle loaded. Fast queue control role such as Todo Runner and Backlog Promoter.", "info");
    },
  });
}
