import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelFallback from "../../../node_modules/pi-model-fallback/extensions/index.ts";
import seedModelFallback from "../../../shared/extensions/seed-model-fallback.ts";
import smartFetch from "../../../node_modules/pi-smart-fetch/dist/index.js";
import multicaSpine from "../../../node_modules/pi-multica-spine/extensions/index.ts";
import codexConversion from "../../../node_modules/@howaboua/pi-codex-conversion/src/index.ts";
import status from "./status.ts";

export default async function IosCodex55PlannerBundle(pi: ExtensionAPI) {
  await modelFallback(pi);
  await seedModelFallback(pi);
  await smartFetch(pi);
  await multicaSpine(pi);
  await codexConversion(pi);
  await status(pi);
}
