import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function CodexSparkPatchRunnerBundle(pi: ExtensionAPI) {
  pi.registerCommand("codex-spark-patch-runner:bundle-status", {
    description: "Show Codex Spark Patch Runner bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Codex Spark Patch Runner bundle loaded. Low-cost Spark PR-producing patch lane for tiny fixes.", "info");
    },
  });
}
