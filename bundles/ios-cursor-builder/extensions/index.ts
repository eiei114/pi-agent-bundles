import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelFallback from "../../../node_modules/pi-model-fallback/extensions/index.ts";
import seedModelFallback from "../../../shared/extensions/seed-model-fallback.ts";
import fff from "../../../node_modules/pi-fff/index.ts";
import nonAsciiGuard from "../../../node_modules/pi-fff-non-ascii-guard/extensions/pi-fff-non-ascii-guard.ts";
import mcpAdapter from "../../../node_modules/pi-mcp-adapter/index.ts";
import multicaSpine from "../../../node_modules/pi-multica-spine/extensions/index.ts";
import postContextGuard from "../../../shared/multica-run-guard/extensions/multica-run-guard.ts";
import loadCursorSdk from "../../../shared/extensions/load-cursor-sdk.mjs";
import status from "./status.ts";

export default async function IosCursorBuilderBundle(pi: ExtensionAPI) {
  await modelFallback(pi);
  await seedModelFallback(pi);
  await fff(pi);
  await nonAsciiGuard(pi);
  await mcpAdapter(pi);
  await multicaSpine(pi);
  await postContextGuard(pi);
  await loadCursorSdk(pi);
  await status(pi);
}
