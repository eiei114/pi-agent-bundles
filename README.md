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

## Included bundles

### `multica-maintenance`

Loads:

- `pi-model-fallback`
- shared fallback config seeding extension
- `/multica-bundle:status`

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

The seed extension only writes config when `model-fallback/config.json` is missing. Existing user or project config is not overwritten.

## Multiple bundles in one repo

Add more bundles under `bundles/<bundle-name>/extensions` or `bundles/<bundle-name>/skills`. Pi package filters can include only the resources a given agent should load.

Example filtered install in settings:

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/multica-maintenance/extensions/status.ts",
    "+node_modules/pi-model-fallback/extensions/index.ts"
  ],
  "skills": []
}
```
