import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function IosCursorBuilderBundle(pi: ExtensionAPI) {
  pi.registerCommand("ios-cursor-builder:bundle-status", {
    description: "Show iOS Cursor Builder bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "iOS Cursor Builder bundle loaded. SwiftUI/UI-heavy implementation role with MCP adapter support for simulator, screenshots, and visual verification.",
        "info",
      );
    },
  });
}
