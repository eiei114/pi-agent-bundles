import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function IosCodex54BuilderBundle(pi: ExtensionAPI) {
  pi.registerCommand("ios-codex54-builder:bundle-status", {
    description: "Show iOS Codex 5.4 Builder bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "iOS Codex 5.4 Builder bundle loaded. Stable implementation role for Swift packages, Xcode builds, tests, persistence, and MCP-backed build/run workflows.",
        "info",
      );
    },
  });
}
