#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function parseMajor(version) {
  const match = /^(\d+)/.exec(version ?? "");
  return match ? Number(match[1]) : NaN;
}

function satisfiesCaret(required, actual) {
  if (!required?.startsWith("^")) return required === actual;
  const floor = required.slice(1);
  const [reqMajor, reqMinor = 0, reqPatch = 0] = floor.split(".").map(Number);
  const [actMajor, actMinor = 0, actPatch = 0] = actual.split(".").map(Number);
  if (actMajor !== reqMajor) return false;
  if (actMinor > reqMinor) return true;
  if (actMinor < reqMinor) return false;
  return actPatch >= reqPatch;
}

export function resolveCursorDependencyContract(packageJson, packageLock) {
  const sdkVersion = packageJson.dependencies?.["@cursor/sdk"];
  const cursorSdk = packageLock.packages?.["node_modules/@cursor/sdk"] ?? {};
  const protobufVersion = cursorSdk.dependencies?.["@bufbuild/protobuf"];
  const connectRange = cursorSdk.dependencies?.["@connectrpc/connect"];

  if (!sdkVersion || !protobufVersion || !connectRange) {
    return null;
  }

  return Object.freeze({
    "@cursor/sdk": sdkVersion,
    "@bufbuild/protobuf": protobufVersion,
    "@connectrpc/connect": packageJson.dependencies?.["@connectrpc/connect"],
    connectRange,
  });
}

export function validateCursorDependencyContract(packageJson, packageLock) {
  const errors = [];
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  const rootLock = packageLock.packages?.[""] ?? {};

  if (!contract) {
    errors.push("Could not resolve Cursor dependency contract from package.json and package-lock.json");
    return errors;
  }

  const pinnedPackages = ["@cursor/sdk", "@bufbuild/protobuf", "@connectrpc/connect"];
  for (const name of pinnedPackages) {
    const expectedVersion = contract[name];
    const declaredVersion = packageJson.dependencies?.[name];
    const lockedRootVersion = rootLock.dependencies?.[name];
    const installedVersion = packageLock.packages?.[`node_modules/${name}`]?.version;

    if (declaredVersion !== expectedVersion) {
      errors.push(`${name}: package.json must pin ${expectedVersion}; found ${declaredVersion ?? "missing"}`);
    }
    if (lockedRootVersion !== expectedVersion) {
      errors.push(`${name}: package-lock root must pin ${expectedVersion}; found ${lockedRootVersion ?? "missing"}`);
    }
    if (installedVersion !== expectedVersion) {
      errors.push(`${name}: package-lock node must resolve ${expectedVersion}; found ${installedVersion ?? "missing"}`);
    }
  }

  const cursorSdk = packageLock.packages?.["node_modules/@cursor/sdk"] ?? {};
  if (cursorSdk.version !== contract["@cursor/sdk"]) {
    errors.push(`@cursor/sdk: lockfile must resolve ${contract["@cursor/sdk"]}; found ${cursorSdk.version ?? "missing"}`);
  }
  if (cursorSdk.dependencies?.["@bufbuild/protobuf"] !== contract["@bufbuild/protobuf"]) {
    errors.push("@cursor/sdk protobuf dependency drifted from the resolved contract; bump the graph as one tested unit");
  }

  const protobufMajor = parseMajor(contract["@bufbuild/protobuf"]);
  const connectMajor = parseMajor(contract["@connectrpc/connect"]);
  if (protobufMajor !== 1) {
    errors.push(`@bufbuild/protobuf major ${protobufMajor} is unsupported until runtime protoBase64 compatibility is verified`);
  }
  if (connectMajor !== 1) {
    errors.push(`@connectrpc/connect major ${connectMajor} is unsupported until @cursor/sdk adopts Connect v2`);
  }
  if (!satisfiesCaret(contract.connectRange, contract["@connectrpc/connect"])) {
    errors.push(
      `@connectrpc/connect ${contract["@connectrpc/connect"]} must satisfy @cursor/sdk requirement ${contract.connectRange}`,
    );
  }

  const connect = packageLock.packages?.["node_modules/@connectrpc/connect"] ?? {};
  const expectedPeer = protobufMajor === 1 ? "^1.10.0" : `^${protobufMajor}.0.0`;
  if (connect.peerDependencies?.["@bufbuild/protobuf"] !== expectedPeer) {
    errors.push(
      `@connectrpc/connect protobuf peer contract changed (${connect.peerDependencies?.["@bufbuild/protobuf"] ?? "missing"}); upgrade the Cursor graph as one tested unit`,
    );
  }

  return errors;
}

/**
 * `pi-cursor-embedded-compat` fails closed for any graph that is missing from
 * its `SUPPORT_REGISTRY`, and that failure only surfaces when a real Cursor
 * task starts. Node refuses to type-strip `.ts` files inside `node_modules`, so
 * read the published source and import it from a scratch directory to evaluate
 * the registry the runtime will actually use.
 */
export async function loadRegisteredGraphs(root = resolve(fileURLToPath(new URL("..", import.meta.url)))) {
  const registryPath = join(root, "node_modules", "pi-cursor-embedded-compat", "lib", "registry.ts");
  let source;
  try {
    source = await readFile(registryPath, "utf8");
  } catch {
    return { ok: false, error: `pi-cursor-embedded-compat registry is unavailable at ${registryPath}; run npm ci first` };
  }

  const scratch = await mkdtemp(join(tmpdir(), "pi-agent-bundles-compat-registry-"));
  try {
    const copy = join(scratch, "registry.ts");
    await writeFile(copy, source, "utf8");
    const module = await import(pathToFileURL(copy).href);
    const graphs = module.SUPPORT_REGISTRY?.map((entry) => entry.graph);
    if (!Array.isArray(graphs) || graphs.length === 0) {
      return { ok: false, error: "pi-cursor-embedded-compat SUPPORT_REGISTRY is empty or unreadable" };
    }
    return { ok: true, graphs };
  } catch (error) {
    return { ok: false, error: `pi-cursor-embedded-compat registry could not be evaluated: ${error.message}` };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export function resolveBundleGraph(packageJson, packageLock) {
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  const piCursorSdk = packageJson.dependencies?.["pi-cursor-sdk"];
  if (!contract || !piCursorSdk) return null;

  return {
    piCursorSdk,
    cursorSdk: contract["@cursor/sdk"],
    connect: contract["@connectrpc/connect"],
    protobuf: contract["@bufbuild/protobuf"],
  };
}

export function validateRegisteredGraph(packageJson, packageLock, registeredGraphs) {  const graph = resolveBundleGraph(packageJson, packageLock);
  if (!graph) {
    return ["Could not resolve the bundle Cursor dependency graph from package.json and package-lock.json"];
  }

  const registered = (Array.isArray(registeredGraphs) ? registeredGraphs : []).some(
    (candidate) =>
      candidate?.piCursorSdk === graph.piCursorSdk &&
      candidate?.cursorSdk === graph.cursorSdk &&
      candidate?.connect === graph.connect &&
      candidate?.protobuf === graph.protobuf,
  );
  if (registered) return [];

  return [
    `pi-cursor-sdk ${graph.piCursorSdk} / @cursor/sdk ${graph.cursorSdk} / @connectrpc/connect ${graph.connect} / @bufbuild/protobuf ${graph.protobuf} is not registered in pi-cursor-embedded-compat`,
    "register the graph in the shim and publish it before activating this bundle graph",
  ];
}

/**
 * Cursor bundles load one OAuth provider, so the pin must stay exact and its
 * extension entry must exist in the installed tree; a floating range would let
 * the provider drift without a bundle review.
 */
export async function validateCursorProviderPin(root, packageJson) {
  const name = "@rahularya01/pi-cursor";
  const declared = packageJson.dependencies?.[name];
  if (!declared) {
    return [`${name} must be declared as the single Cursor provider`];
  }

  const errors = [];
  if (!/^\d+\.\d+\.\d+$/.test(declared)) {
    errors.push(`${name} must be pinned to an exact version; found ${declared}`);
  }

  const packageRoot = join(root, "node_modules", name);
  try {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    if (manifest.version !== declared) {
      errors.push(`${name}: installed version ${manifest.version} does not match the pin ${declared}`);
    }
    const entry = manifest.pi?.extensions?.[0];
    if (typeof entry !== "string") {
      errors.push(`${name}: manifest declares no pi extension entry`);
    } else if (!existsSync(join(packageRoot, entry))) {
      errors.push(`${name}: extension entry ${entry} is missing from the installed package`);
    }
  } catch {
    errors.push(`${name} is not installed at ${packageRoot}; run npm ci first`);
  }

  return errors;
}

async function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  const errors = validateCursorDependencyContract(packageJson, packageLock);
  const registry = await loadRegisteredGraphs(root);
  if (registry.ok) {
    errors.push(...validateRegisteredGraph(packageJson, packageLock, registry.graphs));
  } else {
    errors.push(registry.error);
  }
  errors.push(...(await validateCursorProviderPin(root, packageJson)));

  if (errors.length > 0) {
    console.error("Cursor dependency contract failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const providerPin = packageJson.dependencies["@rahularya01/pi-cursor"];
  console.log(
    `Cursor dependency contract OK: provider ${providerPin} / protobuf ${contract["@bufbuild/protobuf"]} / connect ${contract["@connectrpc/connect"]} / SDK ${contract["@cursor/sdk"]} / registered graph verified`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
