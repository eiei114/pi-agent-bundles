import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ASSIGNED_ISSUE_RE = /assigned issue ID is:\s*([^\s]+)/i;

export default function multicaRunGuard(pi: ExtensionAPI) {
  let assignedIssue: string | undefined;
  let guardInjected = false;

  pi.on("before_agent_start", (event) => {
    const prompt = String(event?.prompt ?? "");
    const match = prompt.match(ASSIGNED_ISSUE_RE);
    assignedIssue = match?.[1];
    guardInjected = false;

    if (!assignedIssue || !prompt.includes("multica issue get")) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n<multica_run_guard>\nThis is a non-interactive Multica issue run. Do not ask for the next task and do not report infrastructure status as the task. Proceed with the assigned issue workflow in this same turn. First actions: run \`multica issue get ${assignedIssue} --output json\` and read recent comments as requested by the user prompt. Continue until the issue task is complete, blocked, or explicitly unsafe.\n</multica_run_guard>`,
    };
  });

  pi.on("context", (event) => {
    if (!assignedIssue || guardInjected) return;

    const messages = Array.isArray(event.messages) ? [...event.messages] : [];
    messages.push({
      role: "user",
      timestamp: Date.now(),
      content:
        `Multica run guard: begin the assigned issue now by running: multica issue get ${assignedIssue} --output json. ` +
        `Then read recent comments and continue the issue workflow without asking for another instruction.`,
    } as never);
    guardInjected = true;

    return { messages };
  });

  pi.on("agent_end", () => {
    assignedIssue = undefined;
    guardInjected = false;
  });
}
