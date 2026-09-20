import cursorOauth from "../../node_modules/@rahularya01/pi-cursor/dist/index.js";

/**
 * Load the single Cursor provider used by Cursor bundles.
 *
 * `@rahularya01/pi-cursor` resolves credentials through Cursor's own OAuth
 * login (`/login cursor`, the Cursor app, or the Cursor CLI) instead of an API
 * key. It must be the only Cursor provider loaded in a runtime; the retained
 * `load-cursor-sdk.mjs` still loads the Cursor SDK API-key provider for an
 * explicit switch-back run.
 */
export default async function loadCursorOauth(pi) {
  await cursorOauth(pi);
}
