import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function CursorComposerCoreBundle(pi: ExtensionAPI) {
  pi.registerCommand("cursor-composer-core:bundle-status", {
    description: "Show Cursor Composer Core bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "Cursor Composer Core bundle loaded. Local coding tools without MCP or smart-fetch.",
        "info",
      );
    },
  });
}
