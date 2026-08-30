import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fff from "../../../node_modules/pi-fff/index.ts";
import nonAsciiGuard from "../../../node_modules/pi-fff-non-ascii-guard/extensions/pi-fff-non-ascii-guard.ts";
import smartFetch from "../../../node_modules/pi-smart-fetch/dist/index.js";
import contextMode from "../../../node_modules/context-mode/build/adapters/pi/extension.js";
import postContextGuard from "../../../shared/post-context-mode/extensions/multica-run-guard.ts";
import status from "./status.ts";

export default async function PiSparkScoutBundle(pi: ExtensionAPI) {
  await fff(pi);
  await nonAsciiGuard(pi);
  await smartFetch(pi);
  await contextMode(pi);
  await postContextGuard(pi);
  await status(pi);
}
