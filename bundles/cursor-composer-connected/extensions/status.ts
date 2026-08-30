import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function CursorComposerConnectedBundle(pi: ExtensionAPI) {
  pi.registerCommand("cursor-composer-connected:bundle-status", {
    description: "Show Cursor Composer Connected bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "Cursor Composer Connected bundle loaded. Core profile plus MCP adapter and smart-fetch.",
        "info",
      );
    },
  });
}
