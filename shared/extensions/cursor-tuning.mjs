/**
 * Headless Cursor tuning defaults for bundle runs.
 *
 * `@rahularya01/pi-cursor` parks a turn while a mid-tool bridge waits for tool
 * results, and the stream idle watchdog is paused during tool execution. The
 * package default for `PI_CURSOR_ACTIVE_BRIDGE_TTL_MS` is one hour, so a parked
 * run in a headless Multica task looks like an infinite hang instead of a
 * bounded failure.
 *
 * These defaults bound the park to two minutes and keep a small retry budget.
 * Explicit environment values always win, including "0" to disable.
 */
export const CURSOR_TUNING_DEFAULTS = Object.freeze({
  PI_CURSOR_ACTIVE_BRIDGE_TTL_MS: "120000",
  PI_CURSOR_STREAM_IDLE_TIMEOUT_MS: "120000",
  PI_CURSOR_RESUME_IDLE_TIMEOUT_MS: "120000",
  PI_CURSOR_STREAM_IDLE_MAX_RETRIES: "2",
});

export function applyCursorTuningDefaults(env = process.env) {
  const applied = [];
  for (const [name, value] of Object.entries(CURSOR_TUNING_DEFAULTS)) {
    if (typeof env[name] === "string" && env[name].trim().length > 0) continue;
    env[name] = value;
    applied.push(name);
  }
  return applied;
}
