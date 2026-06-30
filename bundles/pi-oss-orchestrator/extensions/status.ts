import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function PiOssOrchestratorBundle(pi: ExtensionAPI) {
  pi.registerCommand("pi-oss-orchestrator:bundle-status", {
    description: "Show Pi OSS Orchestrator bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Pi OSS Orchestrator bundle loaded. Coordination and decomposition role for OSS maintenance and incubator control.", "info");
    },
  });
}
