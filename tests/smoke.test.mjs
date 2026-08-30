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
  "./node_modules/pi-cursor-embedded-compat/extensions/index.ts",
  "./node_modules/pi-cursor-sdk/src/index.ts",
];


const genericBundleSlugs = [
  "cursor-composer-builder",
  "cursor-composer-core",
  "cursor-composer-connected",
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

const controllerBundlesWithoutSpine = new Set([
  "pi-ace-balanced",
  "pi-ace-turbo",
  "pi-spark-router",
  "pi-spark-scout",
]);

const bundlesWithoutModelFallback = new Set(["pi-spark-scout"]);

const genericExtensionProfiles = {
  "cursor-composer-builder": {
    includes: ["context-mode", "pi-cursor-embedded-compat", "pi-cursor-sdk", "pi-multica-spine"],
    excludes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
  },
  "cursor-composer-core": {
    includes: ["context-mode", "pi-cursor-embedded-compat", "pi-cursor-sdk", "pi-multica-spine"],
    excludes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
  },
  "cursor-composer-connected": {
    includes: ["pi-mcp-adapter", "pi-smart-fetch", "context-mode", "pi-cursor-embedded-compat", "pi-cursor-sdk"],
    excludes: ["@howaboua/pi-codex-conversion"],
  },
  "cursor-patch-runner": {
    includes: ["context-mode", "pi-cursor-embedded-compat", "pi-cursor-sdk"],
    excludes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
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
    includes: ["pi-fff", "context-mode"],
    excludes: ["pi-multica-spine", "pi-smart-fetch", "@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "pi-spark-scout": {
    includes: ["pi-fff", "pi-smart-fetch", "context-mode"],
    excludes: ["pi-multica-spine", "@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "codex-spark-patch-runner": {
    includes: ["pi-fff", "pi-mcp-adapter", "context-mode", "pi-multica-spine"],
    excludes: ["@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
};

const iosExtensionProfiles = {
  "ios-cursor-builder": {
    includes: ["pi-mcp-adapter", "context-mode", "pi-cursor-embedded-compat", "pi-cursor-sdk"],
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
  "@bufbuild/protobuf",
  "@connectrpc/connect",
  "@cursor/sdk",
  "@howaboua/pi-codex-conversion",
  "context-mode",
  "pi-cursor-embedded-compat",
  "pi-cursor-sdk",
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

test("Cursor compatibility shim loads before the singleton SDK", async () => {
  const loader = await readFile(new URL("../shared/extensions/load-cursor-sdk.mjs", import.meta.url), "utf8");
  assert.ok(loader.indexOf("pi-cursor-embedded-compat") < loader.indexOf("pi-cursor-sdk"));
  assert.ok(!loader.includes("@offbynan/pi-cursor-provider"));
});

test("Cursor Connected keeps MCP and smart-fetch above Core and Patch", async () => {
  const core = await readFile(new URL("../bundles/cursor-composer-core/extensions/index.ts", import.meta.url), "utf8");
  const connected = await readFile(new URL("../bundles/cursor-composer-connected/extensions/index.ts", import.meta.url), "utf8");
  const builder = await readFile(new URL("../bundles/cursor-composer-builder/extensions/index.ts", import.meta.url), "utf8");
  const patch = await readFile(new URL("../bundles/cursor-patch-runner/extensions/index.ts", import.meta.url), "utf8");
  const coreProfile = await readFile(new URL("../shared/extensions/cursor-composer-core-profile.ts", import.meta.url), "utf8");
  const connectedProfile = await readFile(new URL("../shared/extensions/cursor-composer-connected-profile.ts", import.meta.url), "utf8");

  for (const extension of ["pi-smart-fetch", "pi-mcp-adapter"]) {
    assert.ok(connectedProfile.includes(extension), `Connected should retain ${extension}`);
    assert.ok(!coreProfile.includes(extension), `Core should omit ${extension}`);
    assert.ok(!patch.includes(extension), `Patch should omit ${extension}`);
  }

  assert.ok(core.includes("cursor-composer-core-profile"));
  assert.ok(connected.includes("cursor-composer-connected-profile"));
  assert.ok(builder.includes("cursor-composer-core-profile"));
});


test("context-mode is loaded only through selected role bundles", async () => {
  const builderIndex = await readFile(new URL("../bundles/ios-codex54-builder/extensions/index.ts", import.meta.url), "utf8");
  const plannerIndex = await readFile(new URL("../bundles/ios-codex55-planner/extensions/index.ts", import.meta.url), "utf8");
  assert.ok(builderIndex.includes("context-mode/build/adapters/pi/extension.js"));
  assert.ok(!plannerIndex.includes("context-mode"));
  assert.ok(!packageJson.pi.skills.includes("./node_modules/context-mode/skills"));
});

test("README documents the runtime install prerequisite for explicit bundle loading", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /pi install git:github\.com\/eiei114\/pi-agent-bundles\r?\n/);
  assert.ok(!readme.includes("pi-agent-bundles@v0.6.8"));
  assert.match(readme, /--no-extensions/);
  assert.match(readme, /-e ~\/\.pi\/agent\/git\/github\.com\/eiei114\/pi-agent-bundles\/shared\/extensions\/agent-bundle-loader\.ts/);
  assert.match(readme, /Extension path does not exist/);
});



test("package includes non-iOS Multica agent bundle loader profiles", async () => {
  const loader = await readFile(new URL("../shared/extensions/agent-bundle-loader.ts", import.meta.url), "utf8");

  for (const slug of genericBundleSlugs) {
    const readme = await readFile(new URL(`../bundles/${slug}/README.md`, import.meta.url), "utf8");
    const status = await readFile(new URL(`../bundles/${slug}/extensions/status.ts`, import.meta.url), "utf8");
    const index = await readFile(new URL(`../bundles/${slug}/extensions/index.ts`, import.meta.url), "utf8");
    const cursorLoader = await readFile(new URL("../shared/extensions/load-cursor-sdk.mjs", import.meta.url), "utf8");
    const coreProfile = slug.startsWith("cursor-composer")
      ? await readFile(new URL("../shared/extensions/cursor-composer-core-profile.ts", import.meta.url), "utf8")
      : "";
    const connectedProfile = slug === "cursor-composer-connected"
      ? await readFile(new URL("../shared/extensions/cursor-composer-connected-profile.ts", import.meta.url), "utf8")
      : "";

    assert.match(readme, new RegExp(String.raw`Bundle slug: \`${slug}\``));
    assert.match(readme, new RegExp(String.raw`--no-extensions`));
    assert.match(readme, new RegExp(String.raw`-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts`));
    assert.match(readme, new RegExp(String.raw`--agent-bundle ${slug}`));
    assert.ok(!readme.includes("-e C:/"));
    assert.ok(!readme.includes("-e git:"));
    assert.match(status, new RegExp(`${slug}:bundle-status`));
    const bundleSource = `${index}\n${coreProfile}\n${connectedProfile}`;
    if (bundlesWithoutModelFallback.has(slug)) {
      assert.ok(!bundleSource.includes("pi-model-fallback"), `${slug} should fail closed without model fallback`);
      assert.ok(!bundleSource.includes("seed-model-fallback"), `${slug} should not seed fallback config`);
    } else {
      assert.ok(bundleSource.includes("pi-model-fallback"), `${slug} should include model fallback`);
      assert.ok(bundleSource.includes("seed-model-fallback"), `${slug} should seed fallback config`);
    }
    if (controllerBundlesWithoutSpine.has(slug)) {
      assert.ok(!bundleSource.includes("pi-multica-spine"), `${slug} should not include work-agent spine`);
    } else {
      assert.ok(bundleSource.includes("pi-multica-spine"), `${slug} should include Multica spine`);
    }
    assert.ok(loader.includes(`"${slug}"`), `${slug} should be registered in the bundle loader`);

    const profile = genericExtensionProfiles[slug];
    if (!profile) continue;
    const profileSource = `${bundleSource}\n${cursorLoader}`;
    for (const needle of profile.includes) {
      assert.ok(profileSource.includes(needle), `${slug} should include ${needle}`);
    }
    for (const needle of profile.excludes) {
      assert.ok(!profileSource.includes(needle), `${slug} should not include ${needle}`);
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
    const cursorLoader = await readFile(new URL("../shared/extensions/load-cursor-sdk.mjs", import.meta.url), "utf8");
    const profile = iosExtensionProfiles[slug];
    const profileSource = `${index}\n${cursorLoader}`;
    for (const needle of profile.includes) {
      assert.ok(profileSource.includes(needle), `${slug} should include ${needle}`);
    }
    for (const needle of profile.excludes) {
      assert.ok(!profileSource.includes(needle), `${slug} should not include ${needle}`);
    }
    assert.equal(mcp.mcpServers.xcodebuildmcp.command, "npx");
    assert.deepEqual(mcp.mcpServers.xcodebuildmcp.args, ["-y", "xcodebuildmcp@2.6.2", "mcp"]);
    assert.equal(mcp.mcpServers.xcodebuildmcp.lifecycle, "lazy");
    assert.equal(mcp.mcpServers.xcodebuildmcp.directTools, false);
    assert.equal(mcp.settings.outputGuard, true);
    assert.equal(mcp.settings.directTools, false);
  }
});
