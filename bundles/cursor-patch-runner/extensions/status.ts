import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function CursorPatchRunnerBundle(pi: ExtensionAPI) {
  pi.registerCommand("cursor-patch-runner:bundle-status", {
    description: "Show Cursor Patch Runner bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Cursor Patch Runner bundle loaded. Cursor mechanical patch role for small fixes, formatting, typo and config changes.", "info");
    },
  });
}
