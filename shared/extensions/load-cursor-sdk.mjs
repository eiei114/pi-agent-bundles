import cursorCompat from "../../node_modules/pi-cursor-embedded-compat/extensions/index.ts";
import cursorSdk from "../../node_modules/pi-cursor-sdk/src/index.ts";

/** Load the compatibility shim before the singleton Cursor SDK provider. */
export default async function loadCursorSdk(pi) {
  await cursorCompat(pi);
  await cursorSdk(pi);
}
