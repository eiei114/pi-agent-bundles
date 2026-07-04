import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

const requiredExtensions = [
  "./shared/extensions/agent-bundle-loader.ts",
];

const forbiddenGlobalExtensions = [
  "./shared/extensions",
  "./bundles/*/extensions",
  "./node_modules/pi-model-fallback/extensions",
  "./node_modules/pi-fff/index.ts",
  "./node_modules/pi-fff-non-ascii-guard/extensions",
  "./node_modules/pi-smart-fetch/dist/index.js",
  "./node_modules/pi-mcp-adapter/index.ts",
  "./node_modules/pi-multica-spine/extensions",
  "./node_modules/context-mode/build/adapters/pi/extension.js",
  "./node_modules/@howaboua/pi-codex-conversion/src/index.ts",
  "./node_modules/@offbynan/pi-cursor-provider/index.ts",
];


const iosBundleSlugs = [
  "ios-cursor-builder",
  "ios-codex54-builder",
  "ios-codex55-fixer",
  "ios-codex55-planner",
];


const iosExtensionProfiles = {
  "ios-cursor-builder": {
    includes: ["pi-mcp-adapter", "context-mode", "@offbynan/pi-cursor-provider"],
    excludes: ["pi-smart-fetch", "@howaboua/pi-codex-conversion"],
  },
  "ios-codex54-builder": {
    includes: ["pi-mcp-adapter", "context-mode", "@howaboua/pi-codex-conversion"],
    excludes: ["pi-smart-fetch", "@offbynan/pi-cursor-provider"],
  },
  "ios-codex55-fixer": {
    includes: ["pi-smart-fetch", "pi-mcp-adapter", "context-mode", "@howaboua/pi-codex-conversion"],
    excludes: ["@offbynan/pi-cursor-provider"],
  },
  "ios-codex55-planner": {
    includes: ["pi-smart-fetch", "@howaboua/pi-codex-conversion"],
    excludes: ["pi-mcp-adapter", "context-mode", "pi-fff", "@offbynan/pi-cursor-provider"],
  },
};

const bundledPackages = [
  "@howaboua/pi-codex-conversion",
  "@offbynan/pi-cursor-provider",
  "context-mode",
  "pi-fff",
  "pi-fff-non-ascii-guard",
  "pi-mcp-adapter",
  "pi-multica-spine",
  "pi-smart-fetch",
];

test("package is private git-only bundle", () => {
  assert.equal(packageJson.name, "pi-agent-bundles");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.publishConfig, undefined);
});

test("package loads only the bundle selector globally", () => {
  assert.deepEqual(packageJson.pi.extensions, requiredExtensions);
  assert.deepEqual(packageJson.pi.skills, []);
  for (const extension of forbiddenGlobalExtensions) {
    assert.ok(!packageJson.pi.extensions.includes(extension), `should not globally load ${extension}`);
  }
});

test("package declares all Multica agent extension dependencies", () => {
  assert.ok(packageJson.dependencies["pi-model-fallback"], "missing dependency pi-model-fallback");
  for (const name of bundledPackages) {
    assert.ok(packageJson.dependencies[name], `missing dependency ${name}`);
    assert.ok(packageJson.bundledDependencies.includes(name), `missing bundled dependency ${name}`);
  }
});


test("context-mode is loaded only through selected role bundles", async () => {
  const builderIndex = await readFile(new URL("../bundles/ios-codex54-builder/extensions/index.ts", import.meta.url), "utf8");
  const plannerIndex = await readFile(new URL("../bundles/ios-codex55-planner/extensions/index.ts", import.meta.url), "utf8");
  assert.ok(builderIndex.includes("context-mode/build/adapters/pi/extension.js"));
  assert.ok(!plannerIndex.includes("context-mode"));
  assert.ok(!packageJson.pi.skills.includes("./node_modules/context-mode/skills"));
});

test("package includes dedicated generic iOS agent bundles", async () => {
  for (const slug of iosBundleSlugs) {
    const readme = await readFile(new URL(`../bundles/${slug}/README.md`, import.meta.url), "utf8");
    const status = await readFile(new URL(`../bundles/${slug}/extensions/status.ts`, import.meta.url), "utf8");
    const mcp = JSON.parse(await readFile(new URL(`../bundles/${slug}/mcp.json`, import.meta.url), "utf8"));
    assert.match(readme, new RegExp(String.raw`Bundle slug: \`${slug}\``));
    assert.match(readme, new RegExp(String.raw`-e git:github.com/eiei114/pi-agent-bundles@v0.6.4`));
    assert.match(readme, new RegExp(String.raw`--agent-bundle ${slug}`));
    assert.ok(!readme.includes("-e C:/"));
    assert.match(status, new RegExp(`${slug}:bundle-status`));
    const index = await readFile(new URL(`../bundles/${slug}/extensions/index.ts`, import.meta.url), "utf8");
    const profile = iosExtensionProfiles[slug];
    for (const needle of profile.includes) {
      assert.ok(index.includes(needle), `${slug} should include ${needle}`);
    }
    for (const needle of profile.excludes) {
      assert.ok(!index.includes(needle), `${slug} should not include ${needle}`);
    }
    assert.equal(mcp.mcpServers.xcodebuildmcp.command, "npx");
    assert.deepEqual(mcp.mcpServers.xcodebuildmcp.args, ["-y", "xcodebuildmcp@2.6.2", "mcp"]);
    assert.equal(mcp.mcpServers.xcodebuildmcp.lifecycle, "lazy");
    assert.equal(mcp.mcpServers.xcodebuildmcp.directTools, false);
    assert.equal(mcp.settings.outputGuard, true);
    assert.equal(mcp.settings.directTools, false);
  }
});
