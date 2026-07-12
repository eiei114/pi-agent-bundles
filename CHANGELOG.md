# Changelog

## Unreleased

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
