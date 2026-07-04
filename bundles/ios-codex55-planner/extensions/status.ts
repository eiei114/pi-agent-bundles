import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function IosCodex55PlannerBundle(pi: ExtensionAPI) {
  pi.registerCommand("ios-codex55-planner:bundle-status", {
    description: "Show iOS Codex 5.5 Planner bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "iOS Codex 5.5 Planner bundle loaded. iOS architecture, issue slicing, App Store/privacy, testing, and design-review planning role.",
        "info",
      );
    },
  });
}
