import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function MulticaIntakeAgentBundle(pi: ExtensionAPI) {
  pi.registerCommand("multica-intake-agent:bundle-status", {
    description: "Show Multica Intake Agent bundle status",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Multica Intake Agent bundle loaded. Intake and triage role for new Multica work items.", "info");
    },
  });
}
