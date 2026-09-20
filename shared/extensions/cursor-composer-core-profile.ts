import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelFallback from "../../node_modules/pi-model-fallback/extensions/index.ts";
import seedModelFallback from "./seed-model-fallback.ts";
import fff from "../../node_modules/pi-fff/index.ts";
import nonAsciiGuard from "../../node_modules/pi-fff-non-ascii-guard/extensions/pi-fff-non-ascii-guard.ts";
import multicaSpine from "../../node_modules/pi-multica-spine/extensions/index.ts";
import postContextGuard from "../multica-run-guard/extensions/multica-run-guard.ts";
import loadCursorOauth from "./load-cursor-oauth.mjs";

export default async function loadCursorComposerCore(pi: ExtensionAPI) {
  await modelFallback(pi);
  await seedModelFallback(pi);
  await fff(pi);
  await nonAsciiGuard(pi);
  await multicaSpine(pi);
  await postContextGuard(pi);
  await loadCursorOauth(pi);
}
