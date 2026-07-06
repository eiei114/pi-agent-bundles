import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiSparkScoutBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-spark-scout:bundle-status", {
    description: "Show Pi Spark Scout bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi Spark Scout bundle loaded. Spark text-only scout and seed-planning spillover for GLM quota preservation.", "info");
    },
  });
}
