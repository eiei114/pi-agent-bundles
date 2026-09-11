#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

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

async function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  const errors = validateCursorDependencyContract(packageJson, packageLock);

  if (errors.length > 0) {
    console.error("Cursor dependency contract failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Cursor dependency contract OK: protobuf ${contract["@bufbuild/protobuf"]} / connect ${contract["@connectrpc/connect"]} / SDK ${contract["@cursor/sdk"]}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
