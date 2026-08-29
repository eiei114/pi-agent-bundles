#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const cursorDependencyContract = Object.freeze({
  "@bufbuild/protobuf": "1.10.0",
  "@connectrpc/connect": "1.7.0",
  "@cursor/sdk": "1.0.23",
});

export function validateCursorDependencyContract(packageJson, packageLock) {
  const errors = [];
  const rootLock = packageLock.packages?.[""] ?? {};

  for (const [name, expectedVersion] of Object.entries(cursorDependencyContract)) {
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
  if (cursorSdk.dependencies?.["@bufbuild/protobuf"] !== cursorDependencyContract["@bufbuild/protobuf"]) {
    errors.push("@cursor/sdk protobuf dependency no longer matches the protoBase64-compatible v1 contract");
  }

  const connect = packageLock.packages?.["node_modules/@connectrpc/connect"] ?? {};
  if (connect.peerDependencies?.["@bufbuild/protobuf"] !== "^1.10.0") {
    errors.push("@connectrpc/connect protobuf peer contract changed; upgrade the Cursor graph as one tested unit");
  }

  return errors;
}

async function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
  const errors = validateCursorDependencyContract(packageJson, packageLock);

  if (errors.length > 0) {
    console.error("Cursor dependency contract failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Cursor dependency contract OK: protobuf 1.10.0 / connect 1.7.0 / SDK 1.0.23");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
