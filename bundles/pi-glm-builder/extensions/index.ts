import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelFallback from "../../../node_modules/pi-model-fallback/extensions/index.ts";
import seedModelFallback from "../../../shared/extensions/seed-model-fallback.ts";
import fff from "../../../node_modules/pi-fff/index.ts";
import nonAsciiGuard from "../../../node_modules/pi-fff-non-ascii-guard/extensions/pi-fff-non-ascii-guard.ts";
import smartFetch from "../../../node_modules/pi-smart-fetch/dist/index.js";
import multicaSpine from "../../../node_modules/pi-multica-spine/extensions/index.ts";
import contextMode from "../../../node_modules/context-mode/build/adapters/pi/extension.js";
import postContextGuard from "../../../shared/post-context-mode/extensions/multica-run-guard.ts";
import status from "./status.ts";

export default async function PiGlmBuilderBundle(pi: ExtensionAPI) {
  await modelFallback(pi);
  await seedModelFallback(pi);
  await fff(pi);
  await nonAsciiGuard(pi);
  await smartFetch(pi);
  await multicaSpine(pi);
  await contextMode(pi);
  await postContextGuard(pi);
  await status(pi);
}
