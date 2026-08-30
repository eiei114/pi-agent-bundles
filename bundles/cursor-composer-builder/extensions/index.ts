import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import loadCursorComposerCore from "../../../shared/extensions/cursor-composer-core-profile.ts";
import status from "./status.ts";

export default async function CursorComposerBuilderBundle(pi: ExtensionAPI) {
  await loadCursorComposerCore(pi);
  await status(pi);
}
