# Cursor Composer Connected bundle

Bundle slug: `cursor-composer-connected`

## Purpose

Cursor implementation role for tasks that need MCP or web fetch. Extends the Core profile with `pi-mcp-adapter` and `pi-smart-fetch`.

## Resources

- `extensions/status.ts` — registers `/cursor-composer-connected:bundle-status` for load verification.
- `shared/extensions/cursor-composer-connected-profile.ts` — shared Connected extension profile.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle cursor-composer-connected
```

## Rules

- Do not store secrets in this bundle.
- Keep the exact-pinned Cursor dependency graph and do not reintroduce the OAuth provider.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-composer-connected` to avoid global command collisions.
