import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegisteredGraphs,
  resolveBundleGraph,
  resolveCursorDependencyContract,
  validateCursorDependencyContract,
  validateRegisteredGraph,
} from "../scripts/check-cursor-dependency-contract.mjs";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));

test("the installed shim registers the bundle dependency graph", async () => {
  const registry = await loadRegisteredGraphs();
  assert.equal(registry.ok, true, registry.error);
  assert.deepEqual(validateRegisteredGraph(packageJson, packageLock, registry.graphs), []);
});

test("an unregistered Cursor SDK graph fails closed", () => {
  const driftedPackage = structuredClone(packageJson);
  const driftedLock = structuredClone(packageLock);
  driftedPackage.dependencies["@cursor/sdk"] = "1.0.32";
  driftedLock.packages[""].dependencies["@cursor/sdk"] = "1.0.32";
  driftedLock.packages["node_modules/@cursor/sdk"].version = "1.0.32";

  const registered = [resolveBundleGraph(packageJson, packageLock)];
  const errors = validateRegisteredGraph(driftedPackage, driftedLock, registered);

  assert.ok(errors.some((error) => error.includes("is not registered in pi-cursor-embedded-compat")));
});

test("Cursor dependency contract matches the lockfile", () => {
  assert.deepEqual(validateCursorDependencyContract(packageJson, packageLock), []);
});

test("Cursor dependency contract derives protobuf pin from @cursor/sdk", () => {
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  assert.equal(contract["@cursor/sdk"], packageJson.dependencies["@cursor/sdk"]);
  assert.equal(
    contract["@bufbuild/protobuf"],
    packageLock.packages["node_modules/@cursor/sdk"].dependencies["@bufbuild/protobuf"],
  );
});

test("Cursor dependency contract rejects protobuf v2 drift", () => {
  const contract = resolveCursorDependencyContract(packageJson, packageLock);
  const driftedPackage = structuredClone(packageJson);
  const driftedLock = structuredClone(packageLock);
  driftedPackage.dependencies["@bufbuild/protobuf"] = "2.14.0";
  driftedLock.packages[""].dependencies["@bufbuild/protobuf"] = "2.14.0";
  driftedLock.packages["node_modules/@bufbuild/protobuf"].version = "2.14.0";

  const errors = validateCursorDependencyContract(driftedPackage, driftedLock);
  assert.ok(errors.some((error) => error.includes(`package.json must pin ${contract["@bufbuild/protobuf"]}`)));
  assert.ok(errors.some((error) => error.includes(`package-lock node must resolve ${contract["@bufbuild/protobuf"]}`)));
});

test("Cursor dependency contract rejects connect v2 drift", () => {
  const driftedPackage = structuredClone(packageJson);
  const driftedLock = structuredClone(packageLock);
  driftedPackage.dependencies["@connectrpc/connect"] = "2.1.2";
  driftedLock.packages[""].dependencies["@connectrpc/connect"] = "2.1.2";
  driftedLock.packages["node_modules/@connectrpc/connect"].version = "2.1.2";
  driftedLock.packages["node_modules/@connectrpc/connect"].peerDependencies["@bufbuild/protobuf"] = "^2.0.0";

  const errors = validateCursorDependencyContract(driftedPackage, driftedLock);
  assert.ok(errors.some((error) => error.includes("connect major 2 is unsupported")));
});

test("runtime protobuf export and Cursor SDK import remain compatible", async () => {
  const protobuf = await import("@bufbuild/protobuf");
  assert.equal(typeof protobuf.protoBase64, "object");

  const cursorSdk = await import("@cursor/sdk");
  assert.equal(typeof cursorSdk.Agent, "function");
});
