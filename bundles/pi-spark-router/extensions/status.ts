import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiSparkRouterBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-spark-router:bundle-status", {
    description: "Show Pi Spark Router bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Spark Router bundle loaded. Spark control-plane spillover for Todo Runner and script-first scheduled controllers.", "info");
    },
  });
}
