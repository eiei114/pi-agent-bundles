import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { CURSOR_TUNING_DEFAULTS, applyCursorTuningDefaults } = await import("../shared/extensions/cursor-tuning.mjs");

test("bounds a parked Cursor run to two minutes by default", () => {
  assert.equal(CURSOR_TUNING_DEFAULTS.PI_CURSOR_ACTIVE_BRIDGE_TTL_MS, "120000");
  assert.equal(CURSOR_TUNING_DEFAULTS.PI_CURSOR_STREAM_IDLE_TIMEOUT_MS, "120000");
  assert.equal(CURSOR_TUNING_DEFAULTS.PI_CURSOR_RESUME_IDLE_TIMEOUT_MS, "120000");
  assert.equal(CURSOR_TUNING_DEFAULTS.PI_CURSOR_STREAM_IDLE_MAX_RETRIES, "2");
});

test("applies every tuning default to an empty environment", () => {
  const env = {};
  const applied = applyCursorTuningDefaults(env);

  assert.deepEqual(applied.sort(), Object.keys(CURSOR_TUNING_DEFAULTS).sort());
  for (const [name, value] of Object.entries(CURSOR_TUNING_DEFAULTS)) {
    assert.equal(env[name], value, name);
  }
});

test("never overrides an explicit environment value", () => {
  const env = { PI_CURSOR_ACTIVE_BRIDGE_TTL_MS: "0", PI_CURSOR_STREAM_IDLE_TIMEOUT_MS: "600000" };
  const applied = applyCursorTuningDefaults(env);

  assert.equal(env.PI_CURSOR_ACTIVE_BRIDGE_TTL_MS, "0");
  assert.equal(env.PI_CURSOR_STREAM_IDLE_TIMEOUT_MS, "600000");
  assert.ok(!applied.includes("PI_CURSOR_ACTIVE_BRIDGE_TTL_MS"));
  assert.ok(!applied.includes("PI_CURSOR_STREAM_IDLE_TIMEOUT_MS"));
  assert.ok(applied.includes("PI_CURSOR_STREAM_IDLE_MAX_RETRIES"));
});

test("treats a blank environment value as unset", () => {
  const env = { PI_CURSOR_ACTIVE_BRIDGE_TTL_MS: "   " };
  applyCursorTuningDefaults(env);

  assert.equal(env.PI_CURSOR_ACTIVE_BRIDGE_TTL_MS, CURSOR_TUNING_DEFAULTS.PI_CURSOR_ACTIVE_BRIDGE_TTL_MS);
});

test("the OAuth loader applies tuning before importing the provider", async () => {
  const loader = await readFile(new URL("../shared/extensions/load-cursor-oauth.mjs", import.meta.url), "utf8");
  const tuningCall = loader.indexOf("applyCursorTuningDefaults()");
  const providerCall = loader.indexOf("cursorOauth(pi)");

  assert.ok(tuningCall > -1, "the loader must apply tuning defaults");
  assert.ok(providerCall > -1, "the loader must start the provider");
  assert.ok(tuningCall < providerCall, "tuning must be applied before the provider starts");
});
