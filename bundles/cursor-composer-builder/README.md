# Cursor Composer Builder bundle

Bundle slug: `cursor-composer-builder`

## Purpose

Cursor implementation role for bounded but ambiguous build tasks. This slug remains Core-compatible and loads the same local coding profile as `cursor-composer-core`.

## Resources

- `extensions/status.ts` — registers `/cursor-composer-builder:bundle-status` for load verification.
- `shared/extensions/load-cursor-sdk.mjs` — loads `pi-cursor-embedded-compat` before the `pi-cursor-sdk` singleton.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle cursor-composer-builder
```

## Rules

- Do not store secrets in this bundle.
- Keep the exact-pinned Cursor dependency graph and do not reintroduce the OAuth provider.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-composer-builder` to avoid global command collisions.
- Breaking rollout note: production agents that need MCP/smart-fetch should migrate to `cursor-composer-connected` deliberately; this slug stays Core-compatible until that migration is scheduled.
