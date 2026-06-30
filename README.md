# pi-agent-bundles

Git-distributed Pi package bundles for agent runtimes.

This repo is intentionally Git-only. It is not meant to be published to npm. Install pinned Git refs from each runtime that needs the bundle.

## Install

```bash
pi install git:github.com/eiei114/pi-agent-bundles@v0.1.0
```

For project-local install:

```bash
pi install git:github.com/eiei114/pi-agent-bundles@v0.1.0 -l
```

## Bundled existing extensions

`pi-agent-bundles` now includes the extension packages previously repeated in Multica agent custom args:

- `pi-model-fallback`
- `pi-fff`
- `pi-fff-non-ascii-guard@0.1.6`
- `pi-smart-fetch`
- `pi-multica-spine`
- `context-mode`
- `@howaboua/pi-codex-conversion`
- `@offbynan/pi-cursor-provider`

Agents can use one custom arg pair:

```txt
--no-extensions -e git:github.com/eiei114/pi-agent-bundles@v0.2.0
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

Add more bundles under `bundles/<bundle-name>/extensions` or `bundles/<bundle-name>/skills`. Pi package filters can include only the resources a given agent should load.

Example filtered install in settings:

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-ace-balanced/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-ace-balanced/skills/*/SKILL.md"
  ]
}
```

See `docs/bundle-authoring.md` before adding or changing a bundle.


## Multica run guard

`v0.5.0` keeps context-mode tools enabled while preventing context-mode startup/status text from becoming the task. For assigned Multica issue runs, the bundle strips the context-mode routing anchor from the final user-context message and injects a guard that starts with `multica issue get <issue> --output json`.
