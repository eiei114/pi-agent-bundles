# Changelog

## 0.11.1

### Fixed

- Bound a parked Cursor turn to two minutes in Cursor bundles. `@rahularya01/pi-cursor` pauses the stream idle watchdog while a mid-tool bridge waits for tool results, and its `PI_CURSOR_ACTIVE_BRIDGE_TTL_MS` default is one hour, so a parked headless run held a Multica task slot for 31 minutes with a live process and an open Cursor socket. `shared/extensions/cursor-tuning.mjs` now applies `PI_CURSOR_ACTIVE_BRIDGE_TTL_MS=120000`, `PI_CURSOR_STREAM_IDLE_TIMEOUT_MS=120000`, `PI_CURSOR_RESUME_IDLE_TIMEOUT_MS=120000`, and `PI_CURSOR_STREAM_IDLE_MAX_RETRIES=2` before the provider starts. Explicit environment values win, including `0`.

### Context

Three Multica runs hit `wire_drift: conversationCheckpointUpdate.payload#38,39` right before parking. That field drift is upstream and unfixed in 1.4.36; this change makes the failure bounded and retryable instead of an unbounded hang.

## 0.11.0

### Changed

- Cursor bundles now load the single Cursor provider through `shared/extensions/load-cursor-oauth.mjs`: `@rahularya01/pi-cursor` `1.4.36`, which authenticates with Cursor's own OAuth login (`/login cursor`, the Cursor app, or the Cursor CLI). Affected bundles: `cursor-composer-core`, `cursor-composer-builder`, `cursor-composer-connected`, and `ios-cursor-builder`.
- Retain `pi-cursor-embedded-compat` `0.2.0` with `pi-cursor-sdk` `0.3.6` and the `@cursor/sdk` / Connect / protobuf 1.x graph as the explicit API-key switch-back path. The SDK provider is no longer imported by any bundle, so only one Cursor provider loads per runtime.
- Extend `npm run check:cursor-deps` to verify that `@rahularya01/pi-cursor` is pinned to an installed version whose extension entry exists, in addition to the retained SDK graph registration check.

### Why

With only the API-key SDK path, every Cursor lane needed a Cursor SDK API key that was not provisioned; provider startup failed and the remaining Multica Cursor tasks could not run. The OAuth provider reuses the existing Cursor login and needs no API key.

## 0.10.1

### Fixed

- Pin `pi-cursor-embedded-compat` to `0.2.0` so the `pi-cursor-sdk 0.3.6` / `@cursor/sdk 1.0.31` graph is registered. With `0.1.0` the shim failed closed for every Cursor lane: provider startup ended with `unsupported_graph`, and each Multica task died as `pi exited with error: exit status 1` after ~6s with no tools run.

### Changed

- Restore dependency-drift detection: `scripts/check-cursor-dependency-contract.mjs` now evaluates the installed shim `SUPPORT_REGISTRY` and fails when the bundle graph is not registered there. The rewritten version-derived contract alone accepted the `0.3.6` bump that the shim could not patch.
- Run `npm ci` before the contract check in CI, because the guard reads the installed shim.

## 0.10.0

### Removed

- Remove `context-mode` from every bundle and from the package dependencies. Measured fixed cost in the live Multica shape was +28.5KB first-request payload, +11 tool schemas, and +5.9K input tokens per request, while session tool logs show `ctx_*` at 14 calls out of 15,260 in the last 14 days.
- Remove the `cursor-patch-runner`, `codex-spark-patch-runner`, and `pi-spark-scout` bundles and their loader slugs. Those lanes are retired; their scheduled work moves to the Luna controller lane.
- Remove `pi-mcp-adapter` from the `codex-release-engineer` bundle and the `cursor-composer-connected` profile. The iOS bundles keep it because they use `xcodebuildmcp`.
- Remove the context-mode anchor stripping from the Multica run guard. The guard itself (assigned-issue start plus one nudge) is unchanged in intent.

### Changed

- Bump `@cursor/sdk` to `1.0.31` while keeping the protobuf 1.x / Connect 1.x graph required by the SDK.
- Derive the Cursor dependency contract from the installed `@cursor/sdk` lock entry instead of hard-coded version triples.
- Remove model-fallback loading and fallback seeding from Pi Spark Scout so provider failure stops for explicit routing instead of silently spending another model lane.
- Activate bundle releases immutably: validate each tag in `.bundle-releases/<commit>/`, update only the active release pointer, and import role bundles from the verified root with cache-busted dynamic imports.
- Serialize activation with an exclusive lock file that records pid/start time, refreshes heartbeat during validation, and reclaims only when the owner is gone or heartbeat is stale.
- Verified release markers bind commit and `package-lock.json` hash and require `node_modules` installation evidence before fast-path reuse.
- Preserve validated release roots when pointer persistence fails so a later sync can retry cheaply.
- Document `v0.8.3` bootstrap/prewarm behavior for first activation after upgrading from checkout-mutating releases.
- Load selected role bundles with dynamic import only after auto-sync completes to avoid stale in-memory module activation.
- Split Cursor Composer into Core and Connected profiles; keep `cursor-composer-builder` Core-compatible and document Connected migration as a breaking rollout requirement.
- Remove work-agent-only `pi-multica-spine` from Pi Ace Balanced, Pi Spark Router, and Pi Spark Scout controller bundles.
- Remove research-only smart fetch and MCP adapter extensions from the Cursor Patch Runner bundle.
- Add a pre-install Cursor dependency contract check and block incompatible protobuf/Connect major-version noise until the SDK contract changes.
- Remove work-agent-only `pi-multica-spine` from the Pi Ace Turbo controller bundle.
- Replace the old OAuth Cursor provider in Cursor bundles with exact-pinned `pi-cursor-sdk` plus `pi-cursor-embedded-compat`.
- Pin the live DOT-1586 dependency graph (`@cursor/sdk` 1.0.23, `@connectrpc/connect` 1.7.0, `@bufbuild/protobuf` 1.10.0).

## 0.7.2

### Changed

- Merge the 2026-08-22 managed OSS dependency and maintenance PR batch.

## 0.7.1

- Restore the unpinned `pi install git:github.com/eiei114/pi-agent-bundles` command as the canonical per-runtime setup and recovery path.
- Document that `--no-extensions` remains compatible with explicit `-e` loading, while the installed Git checkout is a required runtime prerequisite.

## 0.7.0

- Add bundle auto-sync to the newest `v*` release tag before loading a role bundle.
- Document `@latest` install refs and sync env vars (`PI_AGENT_BUNDLES_SYNC`, `PI_AGENT_BUNDLES_SYNC_MINUTES`, `PI_AGENT_BUNDLES_NPM_MINUTES`).
- Keep Multica bundle startup on tagged releases instead of tracking `main` directly.

## 0.6.9

- Bump bundled `pi-multica-spine` to `^0.1.4` for local import closure verification in Work Agent completion checks.

## 0.6.8

- Add Spark spillover bundles for Multica GLM quota distribution: `pi-spark-router`, `pi-spark-scout`, and `codex-spark-patch-runner`.
- Register the new bundles in the shared loader so live Multica agents can use portable Git-package custom args.
- Document the Spark bundles in the README install and bundle lists.

## 0.6.7

- Restore non-iOS role bundle loader entries and index profiles for Cursor, Codex, Pi GLM, Pi Ace, orchestrator, scout, maintenance, and intake agents.
- Load Cursor provider through the selected Cursor Composer/Patch bundles so `cursor/composer-2.5` agents can start with the Git-package `--agent-bundle` args.
- Update non-iOS bundle READMEs to use the same installed Git checkout custom-args shape as the working iOS agents.

## 0.6.6

- Restore `--no-extensions` in recommended Multica args while avoiding machine-local paths by loading the installed Git package checkout under `~/.pi/agent/git/...`.

## 0.6.5

- Document and validate Git package runtime usage without `--no-extensions`, because Pi disables Git package extension loading when `--no-extensions` is present.

## 0.6.4

- Update bundled runtime extension dependencies to their latest published versions.
- Add a git-package `--agent-bundle <slug>` loader so Multica custom args no longer need machine-local extension paths.
- Move iOS MCP setup out of local `--mcp-config <path>` custom args; store the JSON in the Multica agent MCP config instead.

## 0.6.3

- Narrow iOS bundle filtered install examples so each agent loads only role-relevant Pi extensions.
- Keep MCP/context-mode off the iOS planner default profile while preserving xcodebuild MCP for builder/fixer roles.

## 0.6.2

- Configure each generic iOS bundle's per-agent `mcp.json` with a lazy `xcodebuildmcp` server using `npx -y xcodebuildmcp@2.6.2 mcp`.
- Keep MCP direct tools disabled by default and rely on the token-efficient proxy.

## 0.6.1

- Add per-agent `mcp.json` files for the generic iOS bundles so each Multica agent can use its own MCP adapter config via `--mcp-config`.
- Document per-agent MCP config ownership and keep committed configs secret-free with empty `mcpServers` defaults.

## 0.6.0

- Add dedicated generic iOS agent bundle slices for Cursor Builder, Codex 5.4 Builder, Codex 5.5 Fixer, and Codex 5.5 Planner.
- Bundle `pi-mcp-adapter` so iOS agents can use MCP servers such as `xcodebuildmcp` through Pi's token-efficient MCP proxy.
- Document iOS filtered install examples and MCP config boundaries.
- Add Buy Me a Coffee sponsor button to README and native GitHub funding link via `.github/FUNDING.yml`.

## 0.5.0

- Keep context-mode tools enabled but stop auto-loading the context-mode skill for Multica work-agent runs.
- Add a post-context-mode Multica run guard that removes the context-mode routing anchor from assigned-issue turns and forces the agent to begin the issue workflow instead of reporting context-mode status.

## 0.4.0

- Consume `pi-model-fallback` Git tag `v0.3.0`, which uses `agent_start` and catches provider SDK error messages on `turn_end`.
- Document that Multica agents must not pass `--no-extensions`, because it prevents explicit bundle loading in this Pi CLI path.

## 0.3.0

- Use `pi-model-fallback` Git tag `v0.2.0` to enable persistent failover state without requiring an npm publish.
- Future sessions preselect DeepSeek fallback after a matching ZAI 429/5xx failure until cooldown expiry.

## 0.2.0

- Bundle existing Multica agent extension package dependencies so agent `custom_args` can use only this Git package.
- Load pi-fff, pi-fff-non-ascii-guard, pi-smart-fetch, pi-multica-spine, context-mode, Codex conversion, and Cursor provider through `pi-agent-bundles`.

## 0.1.1

- Add per-agent bundle skeletons for current Multica agent roster.
- Add bundle authoring guide and unique bundle status commands.

## 0.1.0

- Initial Git-only Pi agent bundle repo.
- Bundle `pi-model-fallback` through npm dependency.
- Seed default Multica fallback config: `zai/*` 429/5xx -> `deepseek/deepseek-v4-flash`.
- Add `/multica-bundle:status`.
