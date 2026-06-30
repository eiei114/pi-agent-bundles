import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("package is private git-only bundle", () => {
  assert.equal(packageJson.name, "pi-agent-bundles");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.publishConfig, undefined);
});

test("package loads shared, bundle, and bundled dependency extensions", () => {
  assert.deepEqual(packageJson.pi.extensions, [
    "./shared/extensions",
    "./bundles/*/extensions",
    "./node_modules/pi-model-fallback/extensions",
  ]);
});

test("package depends on pi-model-fallback", () => {
  assert.equal(packageJson.dependencies["pi-model-fallback"], "^0.1.0");
  assert.ok(packageJson.bundledDependencies.includes("pi-model-fallback"));
});
