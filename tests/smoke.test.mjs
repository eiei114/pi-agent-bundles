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
  "./node_modules/@rahularya01/pi-cursor/dist/index.js",
];


const genericBundleSlugs = [
  "cursor-composer-builder",
  "cursor-composer-core",
  "cursor-composer-connected",
  "codex-release-engineer",
  "pi-glm-builder",
  "pi-ace",
  "pi-ace-balanced",
  "pi-ace-air",
  "pi-ace-turbo",
  "pi-spark-router",
  "pi-oss-orchestrator",
  "pi-extension-research-scout",
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
]);

const bundlesWithoutModelFallback = new Set();

const genericExtensionProfiles = {
  "cursor-composer-builder": {
    includes: ["@rahularya01/pi-cursor", "pi-multica-spine"],
    excludes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
  },
  "cursor-composer-core": {
    includes: ["@rahularya01/pi-cursor", "pi-multica-spine"],
    excludes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
  },
  "cursor-composer-connected": {
    includes: ["pi-smart-fetch", "@rahularya01/pi-cursor"],
    excludes: ["pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
  },
  "codex-release-engineer": {
    includes: ["@howaboua/pi-codex-conversion"],
    excludes: ["pi-mcp-adapter", "@offbynan/pi-cursor-provider"],
  },
  "pi-glm-builder": {
    includes: ["pi-fff", "pi-multica-spine"],
    excludes: ["@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
  "pi-spark-router": {
    includes: ["pi-fff"],
    excludes: ["pi-multica-spine", "pi-smart-fetch", "@offbynan/pi-cursor-provider", "@howaboua/pi-codex-conversion"],
  },
};

const iosExtensionProfiles = {
  "ios-cursor-builder": {
    includes: ["pi-mcp-adapter", "@rahularya01/pi-cursor"],
    excludes: ["pi-smart-fetch", "@howaboua/pi-codex-conversion"],
  },
  "ios-codex54-builder": {
    includes: ["pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
    excludes: ["pi-smart-fetch", "@offbynan/pi-cursor-provider"],
  },
  "ios-codex55-fixer": {
    includes: ["pi-smart-fetch", "pi-mcp-adapter", "@howaboua/pi-codex-conversion"],
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
  "@rahularya01/pi-cursor",
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

test("Cursor bundles load exactly one Cursor provider", async () => {
  const oauthLoader = await readFile(new URL("../shared/extensions/load-cursor-oauth.mjs", import.meta.url), "utf8");
  assert.ok(oauthLoader.includes("@rahularya01/pi-cursor"), "the OAuth loader must pin @rahularya01/pi-cursor");
  assert.ok(!oauthLoader.includes("pi-cursor-sdk"), "the OAuth loader must not load the API-key SDK provider");
  assert.ok(!oauthLoader.includes("@offbynan/pi-cursor-provider"));

  const coreProfile = await readFile(new URL("../shared/extensions/cursor-composer-core-profile.ts", import.meta.url), "utf8");
  assert.ok(coreProfile.includes("load-cursor-oauth.mjs"), "the Core profile should load the OAuth provider");
  assert.ok(!coreProfile.includes("load-cursor-sdk.mjs"), "the Core profile must not load two Cursor providers");

  const connectedProfile = await readFile(new URL("../shared/extensions/cursor-composer-connected-profile.ts", import.meta.url), "utf8");
  assert.ok(connectedProfile.includes("cursor-composer-core-profile"), "Connected should reuse the Core profile");
  assert.ok(!connectedProfile.includes("load-cursor-sdk.mjs"), "Connected must not load two Cursor providers");
});

test("the retained SDK loader keeps the compatibility shim before the singleton", async () => {
  const loader = await readFile(new URL("../shared/extensions/load-cursor-sdk.mjs", import.meta.url), "utf8");
  assert.ok(loader.indexOf("pi-cursor-embedded-compat") < loader.indexOf("pi-cursor-sdk"));
  assert.ok(!loader.includes("@offbynan/pi-cursor-provider"));
});

test("Cursor Connected keeps smart-fetch above Core and the retired Patch lane", async () => {
  const core = await readFile(new URL("../bundles/cursor-composer-core/extensions/index.ts", import.meta.url), "utf8");
  const connected = await readFile(new URL("../bundles/cursor-composer-connected/extensions/index.ts", import.meta.url), "utf8");
  const builder = await readFile(new URL("../bundles/cursor-composer-builder/extensions/index.ts", import.meta.url), "utf8");
  const coreProfile = await readFile(new URL("../shared/extensions/cursor-composer-core-profile.ts", import.meta.url), "utf8");
  const connectedProfile = await readFile(new URL("../shared/extensions/cursor-composer-connected-profile.ts", import.meta.url), "utf8");

  assert.ok(connectedProfile.includes("pi-smart-fetch"), "Connected should retain pi-smart-fetch");
  assert.ok(!coreProfile.includes("pi-smart-fetch"), "Core should omit pi-smart-fetch");
  for (const [name, source] of [["Core", coreProfile], ["Connected", connectedProfile]]) {
    assert.ok(!source.includes("pi-mcp-adapter"), `${name} should omit the MCP adapter`);
  }

  assert.ok(core.includes("cursor-composer-core-profile"));
  assert.ok(connected.includes("cursor-composer-connected-profile"));
  assert.ok(builder.includes("cursor-composer-core-profile"));
  await assert.rejects(
    readFile(new URL("../bundles/cursor-patch-runner/extensions/index.ts", import.meta.url), "utf8"),
    "the retired cursor-patch-runner bundle should not exist",
  );
});


test("no bundle loads context-mode and the package no longer depends on it", async () => {
  const loader = await readFile(new URL("../shared/extensions/agent-bundle-loader.ts", import.meta.url), "utf8");
  for (const slug of allBundleSlugs) {
    const index = await readFile(new URL(`../bundles/${slug}/extensions/index.ts`, import.meta.url), "utf8");
    assert.ok(!index.includes("context-mode"), `${slug} should not load context-mode`);
  }
  for (const profile of ["cursor-composer-core-profile.ts", "cursor-composer-connected-profile.ts"]) {
    const source = await readFile(new URL(`../shared/extensions/${profile}`, import.meta.url), "utf8");
    assert.ok(!source.includes("context-mode"), `${profile} should not load context-mode`);
  }
  for (const retired of ["cursor-patch-runner", "codex-spark-patch-runner", "pi-spark-scout"]) {
    assert.ok(!loader.includes(`"${retired}"`), `${retired} should be unregistered from the bundle loader`);
  }
  assert.equal(packageJson.dependencies["context-mode"], undefined, "context-mode should not be a dependency");
  assert.ok(!packageJson.bundledDependencies.includes("context-mode"));
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
    const cursorLoader = await readFile(new URL("../shared/extensions/load-cursor-oauth.mjs", import.meta.url), "utf8");
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
    const cursorLoader = await readFile(new URL("../shared/extensions/load-cursor-oauth.mjs", import.meta.url), "utf8");
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
