# pi-agent-bundles

Git-distributed Pi package bundles for agent runtimes.

This repo is intentionally Git-only. It is not meant to be published to npm. Install it on every runtime that needs a bundle.

<a href="https://buymeacoffee.com/ekawano114m"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60"></a>

## Install

```bash
pi install git:github.com/eiei114/pi-agent-bundles
```

For project-local install:

```bash
pi install git:github.com/eiei114/pi-agent-bundles -l
```

## Auto-sync latest release tag

`agent-bundle-loader` resolves the newest `v*` release tag, validates it in an isolated git worktree under `.bundle-releases/<commit>/`, and only then updates the active release pointer. The executing Pi install checkout is never checked out or mutated during activation.

- Default: sync at most once every 30 minutes (`PI_AGENT_BUNDLES_SYNC_MINUTES`)
- Disable: `PI_AGENT_BUNDLES_SYNC=0` (loads bundles from the installed checkout for local development)
- Force every run: `PI_AGENT_BUNDLES_SYNC=always`
- Activation stages the release in a versioned release root, runs `npm ci` and smoke there, then atomically updates `.bundle-git-sync.json`
- Runtime bundle imports come from the verified release root with a cache-busted `bundleCommit` query parameter
- Failed validation keeps the previous verified release pointer and never loads the candidate
- Concurrent activations are serialized with an exclusive lock (`.bundle-activation.lock`) that records pid/start time, refreshes heartbeat during long validation, and expires only when the owner is gone or heartbeat is stale
- Upgrading from `v0.8.3` or earlier: the first run can bootstrap from the installed checkout when HEAD matches an exact `v*` tag, `node_modules` is present, dependency smoke passes, and the working tree is clean except for an explicitly tolerated `package-lock.json`-only mutation; otherwise run with `PI_AGENT_BUNDLES_SYNC=always` once to prewarm a verified release root before strict loading applies

### Cursor Composer Core vs Connected rollout

- `cursor-composer-builder` intentionally remains Core-compatible for the first rollout.
- Moving live Multica agents from Builder/Core to `cursor-composer-connected` is a **breaking rollout**: Connected adds MCP and smart-fetch extensions that Core omits. Schedule agent-by-agent migration and keep Builder/Core available for rollback until Connected is verified in production.

## Bundled existing extensions

`pi-agent-bundles` now includes the extension packages previously repeated in Multica agent custom args:

- `pi-model-fallback`
- `pi-fff`
- `pi-fff-non-ascii-guard`
- `pi-smart-fetch`
- `pi-multica-spine`
- `context-mode`
- `@howaboua/pi-codex-conversion`
- `pi-cursor-embedded-compat` (loaded before Cursor SDK)
- `pi-cursor-sdk`
- `@cursor/sdk` `1.0.23`
- `@connectrpc/connect` `1.7.0`
- `@bufbuild/protobuf` `1.10.0`
- `pi-mcp-adapter`

Install the Git package on each runtime, then point `-e` at Pi's documented Git checkout path. This keeps Multica config portable across runtimes, keeps `--no-extensions`, and avoids machine-local `C:/...` paths:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle <bundle-slug>
```

`--no-extensions` disables discovery but still permits explicit `-e` paths. The install step is therefore a runtime prerequisite: it creates the checkout consumed by `-e`. If a runtime reports `Extension path does not exist` or `Unknown option: --agent-bundle`, restore the checkout with the same install command:

```bash
pi install git:github.com/eiei114/pi-agent-bundles
```

Verify before enabling scheduled work:

```bash
pi list
test -f ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
```

Cursor bundles load the guarded compatibility shim before the `pi-cursor-sdk` singleton. The old OAuth Cursor provider is intentionally not bundled. First rollout uses an exact Git tag; keep the previous explicit SDK profile available for rollback.

## Included bundles

Each bundle has its own `bundles/<slug>/README.md` and unique `/<slug>:bundle-status` command.

- `multica-maintenance`
- `pi-ace`
- `pi-ace-balanced`
- `pi-ace-air`
- `pi-ace-turbo`
- `pi-spark-router`
- `pi-spark-scout`
- `pi-oss-orchestrator`
- `pi-extension-research-scout`
- `pi-glm-builder`
- `cursor-composer-builder`
- `cursor-composer-core`
- `cursor-composer-connected`
- `cursor-patch-runner`
- `codex-spark-patch-runner`
- `codex-release-engineer`
- `multica-intake-agent`
- `ios-cursor-builder`
- `ios-codex54-builder`
- `ios-codex55-fixer`
- `ios-codex55-planner`

## iOS agent bundles and MCP

Generic iOS Multica agents should use the dedicated iOS bundle slices:

- `ios-cursor-builder` — SwiftUI/UI-heavy implementation and visual verification
- `ios-codex54-builder` — stable implementation, SwiftPM/Xcode builds, tests
- `ios-codex55-fixer` — Xcode/SwiftPM/signing/build-log repair
- `ios-codex55-planner` — architecture, issue slicing, App Store/privacy/testing review

`pi-mcp-adapter` is bundled so agents can use MCP servers such as `xcodebuildmcp` without loading every MCP tool directly into the prompt. Each iOS bundle includes a secret-free `mcp.json` template, but Multica agents should store that JSON through `multica agent update --mcp-config-file bundles/<slug>/mcp.json` instead of passing a local `--mcp-config C:/...` path in custom args.

The iOS bundle README files intentionally use role-specific git-package args rather than loading the full extension set everywhere: Cursor/UI and Codex builder/fixer bundles include MCP/context-mode, while the planner bundle keeps only planning/review essentials.

## Shared fallback seed

`shared/extensions/seed-model-fallback.ts` writes `model-fallback/config.json` only when missing. Existing user or project config is not overwritten.

Default seeded fallback config:

```json
{
  "version": 1,
  "enabled": true,
  "rules": [
    {
      "name": "multica-zai-to-deepseek-flash",
      "matchProviders": ["zai"],
      "statuses": [429, 500, 502, 503, 504],
      "fallback": { "provider": "deepseek", "model": "deepseek-v4-flash" }
    }
  ]
}
```

## Multiple bundles in one repo

Add more bundles under `bundles/<bundle-name>/extensions` or `bundles/<bundle-name>/skills`. For Multica agents, prefer adding the role to `shared/extensions/agent-bundle-loader.ts` and selecting it with `--agent-bundle <slug>` so the agent config stays portable.

See `docs/bundle-authoring.md` before adding or changing a bundle.


## Multica run guard

`v0.5.0` keeps context-mode tools enabled while preventing context-mode startup/status text from becoming the task. For assigned Multica issue runs, the bundle strips the context-mode routing anchor from the final user-context message and injects a guard that starts with `multica issue get <issue> --output json`.
