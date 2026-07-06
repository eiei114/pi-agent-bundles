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


const genericBundleSlugs = [
  "cursor-composer-builder",
  "cursor-patch-runner",
  "codex-release-engineer",
  "pi-glm-builder",
  "pi-ace",
  "pi-ace-balanced",
  "pi-ace-air",
  "pi-ace-turbo",
  "pi-spark-router",
  "pi-spark-scout",
  "pi-oss-orchestrator",
  "pi-extension-research-scout",
  "codex-spark-patch-runner",
  "multica-intake-agent",
  "multica-maintenance",
];

const iosBundleSlugs = [
  "ios-cursor-builder",
  "ios-codex54-builder",
  "ios-codex55-fixer",
  "ios-codex55-planner",
];

const allBundleSlugs = [...genericBundleSlugs, ...iosBundleSlugs];

const genericExtensionProfiles = {
  "cursor-composer-builder": {
    includes: ["pi-mcp-adapter", "context-mode", "@offbynan/pi-cursor-provider"],
    excludes: ["@howaboua/pi-codex-conversion"],
  },
  "cursor-patch-runner": {
    includes: ["pi-mcp-adapter", "context-mode", "@offbynan/pi-cursor-provider"],
    excludes: ["@howaboua/pi-codex-conversion"],
  },
  "codex-release-engineer": {
    includes: ["pi-mcp-adapter", "context-mode", "@howaboua/pi-codex-conversion"],
    excludes: ["@offbynan/pi-cursor-provider"],
  },
  "pi-glm-builder": {
    includes: ["pi-fff", "context-mode", "pi-multica-spine"],
    excludes: ["@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "pi-spark-router": {
    includes: ["pi-fff", "context-mode", "pi-multica-spine"],
    excludes: ["pi-smart-fetch", "@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "pi-spark-scout": {
    includes: ["pi-fff", "pi-smart-fetch", "context-mode", "pi-multica-spine"],
    excludes: ["@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "codex-spark-patch-runner": {
    includes: ["pi-fff", "pi-mcp-adapter", "context-mode", "pi-multica-spine"],
    excludes: ["@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
};

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



test("package includes non-iOS Multica agent bundle loader profiles", async () => {
  const loader = await readFile(new URL("../shared/extensions/agent-bundle-loader.ts", import.meta.url), "utf8");

  for (const slug of genericBundleSlugs) {
    const readme = await readFile(new URL(`../bundles/${slug}/README.md`, import.meta.url), "utf8");
    const status = await readFile(new URL(`../bundles/${slug}/extensions/status.ts`, import.meta.url), "utf8");
    const index = await readFile(new URL(`../bundles/${slug}/extensions/index.ts`, import.meta.url), "utf8");

    assert.match(readme, new RegExp(String.raw`Bundle slug: \`${slug}\``));
    assert.match(readme, new RegExp(String.raw`--no-extensions`));
    assert.match(readme, new RegExp(String.raw`-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts`));
    assert.match(readme, new RegExp(String.raw`--agent-bundle ${slug}`));
    assert.ok(!readme.includes("-e C:/"));
    assert.ok(!readme.includes("-e git:"));
    assert.match(status, new RegExp(`${slug}:bundle-status`));
    assert.ok(index.includes("pi-model-fallback"), `${slug} should include model fallback`);
    assert.ok(index.includes("seed-model-fallback"), `${slug} should seed fallback config`);
    assert.ok(index.includes("pi-multica-spine"), `${slug} should include Multica spine`);
    assert.ok(loader.includes(`"${slug}"`), `${slug} should be registered in the bundle loader`);

    const profile = genericExtensionProfiles[slug];
    if (!profile) continue;
    for (const needle of profile.includes) {
      assert.ok(index.includes(needle), `${slug} should include ${needle}`);
    }
    for (const needle of profile.excludes) {
      assert.ok(!index.includes(needle), `${slug} should not include ${needle}`);
    }
  }
});

test("package includes dedicated generic iOS agent bundles", async () => {
  for (const slug of iosBundleSlugs) {
    const readme = await readFile(new URL(`../bundles/${slug}/README.md`, import.meta.url), "utf8");
    const status = await readFile(new URL(`../bundles/${slug}/extensions/status.ts`, import.meta.url), "utf8");
    const mcp = JSON.parse(await readFile(new URL(`../bundles/${slug}/mcp.json`, import.meta.url), "utf8"));
    assert.match(readme, new RegExp(String.raw`Bundle slug: \`${slug}\``));
    assert.match(readme, new RegExp(String.raw`--no-extensions`));
    assert.match(readme, new RegExp(String.raw`-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts`));
    assert.match(readme, new RegExp(String.raw`--agent-bundle ${slug}`));
    assert.ok(!readme.includes("-e C:/"));
    assert.ok(!readme.includes("-e git:"));
    assert.match(status, new RegExp(`${slug}:bundle-status`));
    const loader = await readFile(new URL("../shared/extensions/agent-bundle-loader.ts", import.meta.url), "utf8");
    assert.ok(loader.includes(`"${slug}"`), `${slug} should be registered in the bundle loader`);
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
