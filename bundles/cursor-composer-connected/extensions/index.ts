import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import loadCursorComposerConnected from "../../../shared/extensions/cursor-composer-connected-profile.ts";
import status from "./status.ts";

export default async function CursorComposerConnectedBundle(pi: ExtensionAPI) {
  await loadCursorComposerConnected(pi);
  await status(pi);
}
