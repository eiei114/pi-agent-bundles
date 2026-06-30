# Changelog

## 0.5.0

- Keep context-mode tools enabled but stop auto-loading the context-mode skill for Multica work-agent runs.
- Add a post-context-mode Multica run guard that removes the context-mode routing anchor from assigned-issue turns and forces the agent to begin the issue workflow instead of reporting context-mode status.

## 0.4.0

- Consume `pi-model-fallback` Git tag `v0.3.0`, which uses `agent_start` and catches provider SDK error messages on `turn_end`.
- Document that Multica agents must not pass `--no-extensions`, because it prevents explicit bundle loading in this Pi CLI path.

## 0.3.0

- Use `pi-model-fallback` from Git tag `v0.2.0` to enable persistent failover state without requiring an npm publish.
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
