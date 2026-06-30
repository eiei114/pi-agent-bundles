import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Message = {
  role?: string;
  content?: unknown;
  [key: string]: unknown;
};

const ASSIGNED_ISSUE_RE = /assigned issue ID is:\s*([^\s]+)/i;
const CONTEXT_MODE_ANCHOR = "context-mode active. Hierarchy:";

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
      systemPrompt: `${event.systemPrompt}\n\n<multica_run_guard>\nThis is a non-interactive Multica issue run. Context-mode may be active, but it is support infrastructure, not the user's task. Do not answer with context-mode status, do not run ctx_doctor unless explicitly requested, and do not ask for the next task. Proceed with the assigned issue workflow in this same turn. First actions: run \`multica issue get ${assignedIssue} --output json\` and read recent comments as requested by the user prompt. Continue until the issue task is complete, blocked, or explicitly unsafe.\n</multica_run_guard>`,
    };
  });

  pi.on("context", (event) => {
    if (!assignedIssue) return;

    const messages = Array.isArray(event.messages) ? [...event.messages] : [];
    const filtered = messages.filter((message) => !isContextModeAnchorMessage(message as unknown as Message));

    if (!guardInjected) {
      filtered.push({
        role: "user",
        timestamp: Date.now(),
        content:
          `Multica run guard: context-mode is already enabled. Ignore context-mode startup/status as a task. ` +
          `Begin the assigned issue now by running: multica issue get ${assignedIssue} --output json. ` +
          `Then read recent comments and continue the issue workflow without asking for another instruction.`,
      } as never);
      guardInjected = true;
    }

    return { messages: filtered };
  });

  pi.on("agent_end", () => {
    assignedIssue = undefined;
    guardInjected = false;
  });
}

function isContextModeAnchorMessage(message: Message): boolean {
  if (message.role !== "user") return false;
  const text = messageText(message.content);
  return text.includes(CONTEXT_MODE_ANCHOR);
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part)) return typeof part.text === "string" ? part.text : "";
        return "";
      })
      .join("\n");
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
