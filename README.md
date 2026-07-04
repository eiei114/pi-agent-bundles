# pi-agent-bundles

Git-distributed Pi package bundles for agent runtimes.

This repo is intentionally Git-only. It is not meant to be published to npm. Install pinned Git refs from each runtime that needs the bundle.

<a href="https://buymeacoffee.com/ekawano114m"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60"></a>

## Install

```bash
pi install git:github.com/eiei114/pi-agent-bundles@v0.6.4
```

For project-local install:

```bash
pi install git:github.com/eiei114/pi-agent-bundles@v0.6.4 -l
```

## Bundled existing extensions

`pi-agent-bundles` now includes the extension packages previously repeated in Multica agent custom args:

- `pi-model-fallback`
- `pi-fff`
- `pi-fff-non-ascii-guard`
- `pi-smart-fetch`
- `pi-multica-spine`
- `context-mode`
- `@howaboua/pi-codex-conversion`
- `@offbynan/pi-cursor-provider`
- `pi-mcp-adapter`

Agents should use the Git package plus a bundle selector. This keeps Multica config portable across runtimes and avoids machine-local `C:/...` paths:

```txt
--no-extensions
-e git:github.com/eiei114/pi-agent-bundles@v0.6.4
--agent-bundle <bundle-slug>
```

## Included bundles

Each bundle has its own `bundles/<slug>/README.md` and unique `/<slug>:bundle-status` command.

- `multica-maintenance`
- `pi-ace`
- `pi-ace-balanced`
- `pi-ace-air`
- `pi-ace-turbo`
- `pi-oss-orchestrator`
- `pi-extension-research-scout`
- `pi-glm-builder`
- `cursor-composer-builder`
- `cursor-patch-runner`
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
