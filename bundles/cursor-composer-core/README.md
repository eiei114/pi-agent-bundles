# Cursor Composer Core bundle

Bundle slug: `cursor-composer-core`

## Purpose

Cursor implementation role with local coding tools only. Loads Cursor SDK, spine, fff/non-ASCII guard, and context-mode without MCP or smart-fetch.

## Resources

- `extensions/status.ts` — registers `/cursor-composer-core:bundle-status` for load verification.
- `shared/extensions/cursor-composer-core-profile.ts` — shared Core extension profile.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle cursor-composer-core
```

## Rules

- Do not store secrets in this bundle.
- Keep the exact-pinned Cursor dependency graph and do not reintroduce the OAuth provider.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-composer-core` to avoid global command collisions.
