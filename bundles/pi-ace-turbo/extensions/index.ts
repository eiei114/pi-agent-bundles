import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelFallback from "../../../node_modules/pi-model-fallback/extensions/index.ts";
import seedModelFallback from "../../../shared/extensions/seed-model-fallback.ts";
import status from "./status.ts";

export default async function PiAceTurboBundle(pi: ExtensionAPI) {
  await modelFallback(pi);
  await seedModelFallback(pi);
  await status(pi);
}
