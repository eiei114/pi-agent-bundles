# Changelog

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
