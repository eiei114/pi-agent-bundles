import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import smartFetch from "../../node_modules/pi-smart-fetch/dist/index.js";
import mcpAdapter from "../../node_modules/pi-mcp-adapter/index.ts";
import loadCursorComposerCore from "./cursor-composer-core-profile.ts";

export default async function loadCursorComposerConnected(pi: ExtensionAPI) {
  await loadCursorComposerCore(pi);
  await smartFetch(pi);
  await mcpAdapter(pi);
}
