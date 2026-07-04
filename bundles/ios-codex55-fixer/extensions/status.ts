import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function IosCodex55FixerBundle(pi: ExtensionAPI) {
  pi.registerCommand("ios-codex55-fixer:bundle-status", {
    description: "Show iOS Codex 5.5 Fixer bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "iOS Codex 5.5 Fixer bundle loaded. Xcode/SwiftPM/signing/build-log repair role with context-mode and MCP adapter support.",
        "info",
      );
    },
  });
}
