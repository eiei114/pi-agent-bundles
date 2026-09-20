import cursorOauth from "../../node_modules/@rahularya01/pi-cursor/dist/index.js";
import { applyCursorTuningDefaults } from "./cursor-tuning.mjs";

/**
 * Load the single Cursor provider used by Cursor bundles.
 *
 * `@rahularya01/pi-cursor` resolves credentials through Cursor's own OAuth
 * login (`/login cursor`, the Cursor app, or the Cursor CLI) instead of an API
 * key. It must be the only Cursor provider loaded in a runtime; the retained
 * `load-cursor-sdk.mjs` still loads the Cursor SDK API-key provider for an
 * explicit switch-back run.
 *
 * Tuning defaults are applied before the provider is imported so a parked
 * headless run fails within two minutes instead of holding a task slot for an
 * hour.
 */
export default async function loadCursorOauth(pi) {
  applyCursorTuningDefaults();
  await cursorOauth(pi);
}
